import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

export interface LibraryBookRecord {
  id: string;
  r2_key: string;
  title: string;
  grade: number;
  level: 'primary' | 'lower_secondary' | 'upper_secondary' | 'general_knowledge';
  subject: string;
  subject_label: string;
  pdf_url: string;
  cover_url?: string;
  file_size: number;
  last_modified: string;
}

interface R2Config {
  configured: boolean;
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

const KHMER_DIGITS_MAP: Record<string, string> = {
  '០': '0',
  '១': '1',
  '២': '2',
  '៣': '3',
  '៤': '4',
  '៥': '5',
  '៦': '6',
  '៧': '7',
  '៨': '8',
  '៩': '9',
};

function toArabicDigits(input: string): string {
  return input.replace(/[០-៩]/g, (ch) => KHMER_DIGITS_MAP[ch] ?? ch);
}

const SUBJECT_MATCHERS: Array<{
  subject: string;
  labelKm: string;
  keywords: string[];
}> = [
  { subject: 'math', labelKm: 'គណិតវិទ្យា', keywords: ['គណិត', 'math', 'mathematics'] },
  { subject: 'khmer', labelKm: 'ភាសាខ្មែរ', keywords: ['ភាសាខ្មែរ', 'អក្សរសាស្ត្រ', 'អក្សរសិល្ប៍', 'តែងសេចក្ដី', 'តែងសេចក្តី', 'khmer'] },
  { subject: 'english', labelKm: 'ភាសាអង់គ្លេស', keywords: ['english', 'អង់គ្លេស'] },
  { subject: 'french', labelKm: 'ភាសាបារាំង', keywords: ['french', 'français', 'បារាំង'] },
  { subject: 'physics', labelKm: 'រូបវិទ្យា', keywords: ['រូបវិទ្យា', 'physics'] },
  { subject: 'chemistry', labelKm: 'គីមីវិទ្យា', keywords: ['គីមី', 'chemistry'] },
  { subject: 'biology', labelKm: 'ជីវវិទ្យា', keywords: ['ជីវ', 'biology'] },
  { subject: 'earth', labelKm: 'ផែនដីវិទ្យា', keywords: ['ផែនដី', 'earth'] },
  { subject: 'science', labelKm: 'វិទ្យាសាស្ត្រ', keywords: ['វិទ្យាសាស្ត្រ', 'science'] },
  { subject: 'history', labelKm: 'ប្រវត្តិវិទ្យា', keywords: ['ប្រវត្តិ', 'history'] },
  { subject: 'geography', labelKm: 'ភូមិវិទ្យា', keywords: ['ភូមិ', 'geography'] },
  { subject: 'civics', labelKm: 'សីលធម៌-ពលរដ្ឋ', keywords: ['សីលធម៌', 'ពលរដ្ឋ', 'civics', 'moral'] },
  { subject: 'social', labelKm: 'សិក្សាសង្គម', keywords: ['សិក្សាសង្គម', 'social'] },
  { subject: 'economics', labelKm: 'សេដ្ឋកិច្ច', keywords: ['សេដ្ឋកិច្ច', 'economics'] },
  { subject: 'ict', labelKm: 'ព័ត៌មានវិទ្យា', keywords: ['ព័ត៌មានវិទ្យា', 'កុំព្យូទ័រ', 'ict', 'computer'] },
  { subject: 'home_economics', labelKm: 'គេហវិទ្យា', keywords: ['គេហវិទ្យា', 'home'] },
];

export function getR2Config(): R2Config {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const endpoint = (
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')
  )
    .trim()
    .replace(/\/+$/, '');
  const bucketName = (process.env.R2_BUCKET_NAME || 'wsd-library').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');

  const configured = Boolean(endpoint && bucketName && accessKeyId && secretAccessKey);
  return {
    configured,
    endpoint,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}

function createR2Client(cfg: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export function encodeR2KeyPath(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function buildPublicPdfUrl(cfg: R2Config, key: string): string {
  const encodedKey = encodeR2KeyPath(key);
  if (cfg.publicUrl) {
    return `${cfg.publicUrl}/${encodedKey}`;
  }
  return `/api/library/pdf-proxy?key=${encodeURIComponent(key)}`;
}

export function getCoverKeyForPdf(pdfKey: string): string {
  const cleanKey = pdfKey.replace(/^\/+/, '');
  return `covers/${cleanKey}.jpg`;
}

export function buildPublicCoverUrl(cfg: R2Config, pdfKey: string): string {
  const coverKey = getCoverKeyForPdf(pdfKey);
  if (cfg.publicUrl) {
    return `${cfg.publicUrl}/${encodeR2KeyPath(coverKey)}`;
  }
  return `/api/library/cover?key=${encodeURIComponent(pdfKey)}`;
}

export function normalizeLibraryGrade(raw: unknown): number {
  if (raw === 0 || raw === '0' || raw === 'general_knowledge' || raw === 'general-knowledge') {
    return 0;
  }
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
    return Math.round(parsed);
  }
  return 12;
}

export function detectGradeFromKey(key: string): number {
  if (/(?:^|\/)general[-_\s]?knowledge(?:\/|$)|ចំណេះដឹងទូទៅ/i.test(key)) {
    return 0;
  }
  const normalized = toArabicDigits(key);
  const folderMatch = normalized.match(/(?:^|\/)\s*(?:grade|gr|g)?\s*[-_\s]*(\d{1,2})\s*(?:\/|$)/i);
  if (folderMatch) {
    const parsed = Number(folderMatch[1]);
    if (parsed >= 1 && parsed <= 12) return parsed;
  }
  const khmerGradeMatch = normalized.match(/ថ្នាក់(?:ទី)?\s*(\d{1,2})/);
  if (khmerGradeMatch) {
    const parsed = Number(khmerGradeMatch[1]);
    if (parsed >= 1 && parsed <= 12) return parsed;
  }
  const anyGradeMatch = normalized.match(/grade\s*[-_\s]*(\d{1,2})/i);
  if (anyGradeMatch) {
    const parsed = Number(anyGradeMatch[1]);
    if (parsed >= 1 && parsed <= 12) return parsed;
  }
  return 12;
}

export function getLevelForGrade(
  grade: number
): 'primary' | 'lower_secondary' | 'upper_secondary' | 'general_knowledge' {
  if (grade === 0) return 'general_knowledge';
  if (grade <= 6) return 'primary';
  if (grade <= 9) return 'lower_secondary';
  return 'upper_secondary';
}

export function detectSubjectFromFilename(filename: string): { subject: string; labelKm: string } {
  const lower = filename.toLowerCase();
  for (const matcher of SUBJECT_MATCHERS) {
    if (matcher.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { subject: matcher.subject, labelKm: matcher.labelKm };
    }
  }
  return { subject: 'general', labelKm: 'សៀវភៅសិក្សា' };
}

export function formatCleanBookTitle(filename: string): string {
  const base = filename
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const stripped = base
    .replace(/^ថ្នាក់(?:ទី)?\s*[០-៩0-9]+\s*[-:_\u17d6.\s]*/iu, '')
    .replace(/^grade\s*[-_\s]*[0-9]+\s*[-:_\u17d6.\s]*/iu, '')
    .replace(/^[\u17d6:\-–—_\s]+/u, '')
    .trim();
  return stripped || base || 'សៀវភៅសិក្សា';
}

export function buildR2BookKey(params: {
  originalName: string;
  grade: number;
  title?: string;
}): string {
  const safeGrade = normalizeLibraryGrade(params.grade);
  const rawBase = (params.title || '').trim() || params.originalName || `book_${Date.now()}.pdf`;
  const cleanName =
    rawBase
      .replace(/[/\\?#%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || `book_${Date.now()}.pdf`;
  const finalName = /\.pdf$/i.test(cleanName) ? cleanName : `${cleanName}.pdf`;
  if (safeGrade === 0) {
    return `general-knowledge/${finalName}`;
  }
  return `grade-${safeGrade}/${finalName}`;
}

export function parseBookMetadataFromKey(
  key: string,
  fileSize: number,
  lastModified: string,
  cfg: R2Config,
  customTitle?: string
): LibraryBookRecord {
  const segments = key.split('/').filter(Boolean);
  const filename = segments[segments.length - 1] || key;
  const grade = detectGradeFromKey(key);
  const level = getLevelForGrade(grade);
  const trimmedTitle = (customTitle || '').trim();
  const isGeneralKnowledge = level === 'general_knowledge';
  const detected = isGeneralKnowledge
    ? { subject: 'general_knowledge', labelKm: 'ចំណេះដឹងទូទៅ' }
    : detectSubjectFromFilename(`${trimmedTitle} ${filename}`);
  const title = trimmedTitle || formatCleanBookTitle(filename);

  return {
    id: key,
    r2_key: key,
    title,
    grade,
    level,
    subject: detected.subject,
    subject_label: detected.labelKm,
    pdf_url: buildPublicPdfUrl(cfg, key),
    file_size: fileSize,
    last_modified: lastModified,
  };
}

export async function listR2Books(): Promise<{
  configured: boolean;
  publicUrl: string;
  bucketName: string;
  books: LibraryBookRecord[];
  totalSizeBytes: number;
}> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    return {
      configured: false,
      publicUrl: cfg.publicUrl,
      bucketName: cfg.bucketName,
      books: [],
      totalSizeBytes: 0,
    };
  }

  const client = createR2Client(cfg);
  const pdfEntries: Array<{ key: string; size: number; lastModified: string }> = [];
  const coverKeys = new Set<string>();
  let continuationToken: string | undefined;
  let totalSizeBytes = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: cfg.bucketName,
      ContinuationToken: continuationToken,
    });
    const response = await client.send(command);

    for (const obj of response.Contents || []) {
      const key = obj.Key || '';
      if (!key || key.endsWith('/')) continue;
      // Skip macOS AppleDouble hidden metadata files if dragged in Finder
      const baseName = key.split('/').pop() || '';
      if (baseName.startsWith('._') || baseName === '.DS_Store') continue;

      if (key.startsWith('covers/') && /\.(jpe?g|png|webp)$/i.test(key)) {
        coverKeys.add(key);
        continue;
      }

      if (!/\.pdf$/i.test(key)) continue;

      const size = Number(obj.Size || 0);
      totalSizeBytes += size;
      const lastModified = obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString();
      pdfEntries.push({ key, size, lastModified });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  const books: LibraryBookRecord[] = pdfEntries.map((entry) => {
    const book = parseBookMetadataFromKey(entry.key, entry.size, entry.lastModified, cfg);
    const expectedCoverKey = getCoverKeyForPdf(entry.key);
    if (coverKeys.has(expectedCoverKey)) {
      book.cover_url = buildPublicCoverUrl(cfg, entry.key);
    }
    return book;
  });

  books.sort((a, b) => {
    const ga = a.grade === 0 ? 99 : a.grade;
    const gb = b.grade === 0 ? 99 : b.grade;
    if (ga !== gb) return ga - gb;
    return a.title.localeCompare(b.title, 'km');
  });

  return {
    configured: true,
    publicUrl: cfg.publicUrl,
    bucketName: cfg.bucketName,
    books,
    totalSizeBytes,
  };
}

export async function uploadBookToR2(params: {
  buffer: Buffer;
  originalName: string;
  grade: number;
  title?: string;
  contentType?: string;
}): Promise<LibraryBookRecord> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const key = buildR2BookKey({
    originalName: params.originalName,
    grade: params.grade,
    title: params.title,
  });

  const client = createR2Client(cfg);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType || 'application/pdf',
    })
  );

  return parseBookMetadataFromKey(
    key,
    params.buffer.length,
    new Date().toISOString(),
    cfg,
    params.title
  );
}

export async function createR2MultipartBookUpload(params: {
  originalName: string;
  grade: number;
  title?: string;
  contentType?: string;
}): Promise<{ uploadId: string; key: string; bucketName: string }> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const key = buildR2BookKey({
    originalName: params.originalName,
    grade: params.grade,
    title: params.title,
  });

  const client = createR2Client(cfg);
  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: cfg.bucketName,
      Key: key,
      ContentType: params.contentType || 'application/pdf',
    })
  );

  if (!result.UploadId) {
    throw new Error('Failed to initialize Cloudflare R2 multipart upload.');
  }

  return {
    uploadId: result.UploadId,
    key,
    bucketName: cfg.bucketName,
  };
}

export async function uploadR2BookPart(params: {
  key: string;
  uploadId: string;
  partNumber: number;
  body: Buffer;
}): Promise<{ PartNumber: number; ETag: string }> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const client = createR2Client(cfg);
  const result = await client.send(
    new UploadPartCommand({
      Bucket: cfg.bucketName,
      Key: params.key,
      UploadId: params.uploadId,
      PartNumber: params.partNumber,
      Body: params.body,
      ContentLength: params.body.length,
    })
  );

  if (!result.ETag) {
    throw new Error(`Missing ETag for uploaded part ${params.partNumber}.`);
  }

  return {
    PartNumber: params.partNumber,
    ETag: result.ETag,
  };
}

export async function completeR2MultipartBookUpload(params: {
  key: string;
  uploadId: string;
  parts: Array<{ PartNumber: number; ETag: string }>;
  fileSize: number;
  title?: string;
}): Promise<LibraryBookRecord> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const sortedParts = [...params.parts]
    .filter((p) => Number(p.PartNumber) >= 1 && p.ETag)
    .sort((a, b) => a.PartNumber - b.PartNumber);

  if (sortedParts.length === 0) {
    throw new Error('No uploaded parts provided.');
  }

  const client = createR2Client(cfg);
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: cfg.bucketName,
      Key: params.key,
      UploadId: params.uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    })
  );

  return parseBookMetadataFromKey(
    params.key,
    Number(params.fileSize) || 0,
    new Date().toISOString(),
    cfg,
    params.title
  );
}

export async function abortR2MultipartBookUpload(params: {
  key: string;
  uploadId: string;
}): Promise<void> {
  const cfg = getR2Config();
  if (!cfg.configured || !params.key || !params.uploadId) return;

  try {
    const client = createR2Client(cfg);
    await client.send(
      new AbortMultipartUploadCommand({
        Bucket: cfg.bucketName,
        Key: params.key,
        UploadId: params.uploadId,
      })
    );
  } catch {
    // Best-effort abort cleanup
  }
}

export async function deleteBookFromR2(key: string): Promise<void> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const client = createR2Client(cfg);
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
    })
  );

  // Best-effort cleanup of matching cover thumbnail
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucketName,
        Key: getCoverKeyForPdf(key),
      })
    );
  } catch {
    // Ignore if cover does not exist
  }
}

export async function uploadCoverToR2(params: {
  pdfKey: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const coverKey = getCoverKeyForPdf(params.pdfKey);
  const client = createR2Client(cfg);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: coverKey,
      Body: params.buffer,
      ContentType: params.contentType || 'image/jpeg',
      CacheControl: 'public, max-age=31536000',
    })
  );

  return buildPublicCoverUrl(cfg, params.pdfKey);
}

export async function getR2CoverStream(pdfKey: string) {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const client = createR2Client(cfg);
  return client.send(
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: getCoverKeyForPdf(pdfKey),
    })
  );
}

export async function getR2PdfStream(key: string, range?: string) {
  const cfg = getR2Config();
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured on the server.');
  }

  const client = createR2Client(cfg);
  return client.send(
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
      ...(range ? { Range: range } : {}),
    })
  );
}

function getServerSupabaseClient() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://bnolwghgydybgfhwzpyn.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJub2x3Z2hneWR5YmdmaHd6cHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTI0MDgsImV4cCI6MjEwMzQ4ODQwOH0.eWQHK4iRSxPjqNKYFxnWrqXc9sUOTnvAZEQp_d2IaxE';

  if (!url || !key) return null;
  return createClient(url, key);
}

export async function syncBooksToSupabase(books: LibraryBookRecord[]): Promise<{
  synced: boolean;
  count: number;
  error?: string;
}> {
  const supabase = getServerSupabaseClient();
  if (!supabase || books.length === 0) {
    return { synced: false, count: 0 };
  }

  try {
    const payload = books.map((b) => ({
      r2_key: b.r2_key,
      title: b.title,
      grade: b.grade,
      level: b.level,
      subject: b.subject,
      subject_label: b.subject_label,
      pdf_url: b.pdf_url,
      file_size: b.file_size,
      last_modified: b.last_modified,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('library_books')
      .upsert(payload, { onConflict: 'r2_key' });

    if (error) {
      return { synced: false, count: 0, error: error.message };
    }
    return { synced: true, count: payload.length };
  } catch (err: any) {
    return { synced: false, count: 0, error: err?.message || 'Supabase sync skipped' };
  }
}

export async function deleteBookFromSupabase(r2Key: string): Promise<void> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('library_books').delete().eq('r2_key', r2Key);
  } catch {
    // Ignore if table not created yet
  }
}

export async function listSupabaseLibraryBooks(): Promise<LibraryBookRecord[]> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('library_books')
      .select('id, r2_key, title, grade, level, subject, subject_label, pdf_url, file_size, last_modified')
      .order('grade', { ascending: true })
      .order('title', { ascending: true });

    if (error || !Array.isArray(data)) return [];
    return data as LibraryBookRecord[];
  } catch {
    return [];
  }
}

let cachedPublicStats: {
  studentCount: number;
  bookCount: number;
  subjectCount: number;
  gradeCount: number;
  updatedAt: number;
} | null = null;

export async function getPublicPlatformStats() {
  const now = Date.now();
  if (cachedPublicStats && now - cachedPublicStats.updatedAt < 60_000) {
    return cachedPublicStats;
  }

  const supabase = getServerSupabaseClient();
  let studentCount = 0;
  let books: LibraryBookRecord[] = [];

  if (supabase) {
    try {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true });
      if (typeof count === 'number') {
        studentCount = count;
      }
    } catch {
      // Ignore count error
    }
  }

  const cfg = getR2Config();
  if (cfg.configured) {
    try {
      const r2Data = await listR2Books();
      books = r2Data.books;
    } catch {
      books = await listSupabaseLibraryBooks();
    }
  } else {
    books = await listSupabaseLibraryBooks();
  }

  const subjectSet = new Set<string>();
  const gradeSet = new Set<number>();
  for (const b of books) {
    if (b.subject) subjectSet.add(b.subject);
    if (typeof b.grade === 'number' && b.grade >= 4 && b.grade <= 12) {
      gradeSet.add(b.grade);
    }
  }

  cachedPublicStats = {
    studentCount,
    bookCount: books.length,
    subjectCount: subjectSet.size,
    gradeCount: gradeSet.size || 9,
    updatedAt: now,
  };
  return cachedPublicStats;
}
