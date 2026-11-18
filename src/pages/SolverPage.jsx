import React, { useState, useRef } from 'react';
import Card from '../components/common/Card';
import AuthRequiredBanner from '../components/auth/AuthRequiredBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Camera, Image as ImageIcon, Send, X, Loader2, AlertCircle, Code, ListTodo, Calculator, Copy, Check, Eraser, FileText, RotateCcw } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { latexToPlainText } from '../utils/mathUtils';

const TerminalBox = ({ title, content, icon: Icon }) => {
  const { language } = useLanguage();
  const isKm = language === 'km';
  const [copiedType, setCopiedType] = useState(null); // 'text' | 'latex' | null

  const handleCopyClean = () => {
    const cleanText = latexToPlainText(content);
    navigator.clipboard.writeText(cleanText);
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyLatex = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedType('latex');
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/15 w-full min-w-0 shadow-sm">
      <div className="bg-[#2d2d2d] text-[#d4d4d4] px-3.5 py-2 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          </div>
          <div className="text-xs font-mono text-slate-400 ml-2 flex items-center gap-1.5 truncate">
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Main Clean Math Copy Button */}
          <button 
            onClick={handleCopyClean}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans rounded-md transition-all ${
              copiedType === 'text'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-medium'
                : 'text-slate-300 hover:text-white bg-[#383838] hover:bg-[#444] border border-[#505050]'
            }`}
            title={isKm ? 'ចម្លងជាអត្ថបទគណិតវិទ្យាស្អាត (ងាយស្រួលអាន)' : 'Copy clean math text (easy to read)'}
          >
            {copiedType === 'text' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{isKm ? 'ចម្លង' : 'Copy'}</span>
              </>
            )}
          </button>

          {/* Secondary Copy LaTeX Button */}
          <button
            onClick={handleCopyLatex}
            className={`p-1.5 text-xs rounded-md transition-all ${
              copiedType === 'latex'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#383838]'
            }`}
            title={isKm ? 'ចម្លងកូដឆៅ (LaTeX)' : 'Copy raw LaTeX'}
          >
            {copiedType === 'latex' ? (
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-1">LaTeX ✓</span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-1">LaTeX</span>
            )}
          </button>
        </div>
      </div>
      <div className="p-3.5 sm:p-5 text-sm sm:text-base leading-relaxed terminal-content overflow-x-auto">
        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {content}
        </Markdown>
      </div>
    </div>
  );
};

export default function SolverPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isKm = language === 'km';

  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [canRetry, setCanRetry] = useState(false);
  const [detailedCopied, setDetailedCopied] = useState(false);

  const handleCopyDetailed = () => {
    if (!result?.detailed_answer) return;
    const clean = latexToPlainText(result.detailed_answer);
    navigator.clipboard.writeText(clean);
    setDetailedCopied(true);
    setTimeout(() => setDetailedCopied(false), 2500);
  };

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleReset = () => {
    setText('');
    clearImage();
    setError(null);
    setCanRetry(false);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageFile) {
      setCanRetry(false);
      setError(isKm ? 'សូមបញ្ចូលលំហាត់ជាអត្ថបទ ឬរូបភាព។' : 'Please provide text or an image.');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCanRetry(true);
      setError(
        isKm
          ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់អ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត!'
          : 'Offline — please reconnect and try again.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCanRetry(false);
    setResult(null);

    let response;
    try {
      if (imageFile) {
        const formData = new FormData();
        if (text.trim()) formData.append('text', text);
        formData.append('image', imageFile);
        response = await fetch('/api/solve_problem?t=' + Date.now(), {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/solve_problem?t=' + Date.now(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: text.trim() })
        });
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}...`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setResult(data);
      setCanRetry(false);
    } catch {
      setCanRetry(true);
      setError(
        isKm
          ? 'មានបញ្ហាក្នុងការដោះស្រាយ សូមព្យាយាមម្ដងទៀត!'
          : 'Failed to solve problem. Please try again!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div id="solver-page" className="space-y-6 font-kh-body pb-10">
      {/* Auth Protection */}
      {!isAuthenticated ? (
        <AuthRequiredBanner
          featureName={language === 'km' ? 'ដោះស្រាយលំហាត់' : 'Exercise Solver'}
        />
      ) : (
        <div className="max-w-4xl mx-auto space-y-8 w-full min-w-0">
          {/* Input Section */}
          <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="text-[#38BDF8]" />
                {isKm ? 'បញ្ចូលលំហាត់របស់អ្នក' : 'Input your problem'}
              </h2>
              <button
                type="button"
                onClick={handleReset}
                title={isKm ? 'សម្អាត' : 'Clear'}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              >
                <i className="ri-loop-left-line text-[20px] leading-none"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isKm ? "សរសេរប្រធានលំហាត់នៅទីនេះ..." : "Type your problem here..."}
                  className="w-full min-h-[100px] p-3 bg-white/[0.04] border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] transition-all resize-y text-white placeholder:text-white/45"
                />
              </div>

              {imagePreview && (
                <div className="relative inline-block mt-2 group">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1 bg-[#194350]/90 rounded-md text-white hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    id="camera-input"
                  />
                  <label
                    htmlFor="camera-input"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.07] hover:bg-white/15 text-white rounded-lg cursor-pointer transition text-sm font-semibold"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isKm ? 'ថតរូប' : 'Camera'}</span>
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-input"
                  />
                  <label
                    htmlFor="image-input"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.07] hover:bg-white/15 text-white rounded-lg cursor-pointer transition text-sm font-semibold"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>{isKm ? 'ជ្រើសរើសរូបភាព' : 'Gallery'}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (!text.trim() && !imageFile)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-[#38BDF8] hover:bg-[#56CAF9] disabled:opacity-50 disabled:cursor-not-allowed text-[#092731] rounded-lg cursor-pointer transition shadow-sm font-kh-body font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isKm ? 'កំពុងដោះស្រាយ...' : 'Solving...'}</span>
                    </>
                  ) : canRetry ? (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      <span>{isKm ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{isKm ? 'ដោះស្រាយ' : 'Solve'}</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/15 border border-rose-400/45 text-rose-200 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </form>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 w-full min-w-0">
              {!result.is_problem ? (
                /* Rejection Message */
                <div className="bg-white/[0.06] border border-white/10 p-5 rounded-2xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-6 h-6 text-[#38BDF8] shrink-0" />
                    <div className="text-white font-medium">
                      {result.rejection_reason || (isKm ? 'សូមបញ្ចូលលំហាត់ដែលអ្នកចង់ឲ្យខ្ញុំដោះស្រាយ។' : 'Please input the problem you want me to solve.')}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Short Answer (Terminal Style) */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2 px-1">
                      <Code className="text-white" />
                      {isKm ? 'ចម្លើយខ្លី (សង្ខេប)' : 'Short Answer'}
                    </h3>
                    <TerminalBox 
                      title="wsd-academy.sh" 
                      content={result.short_answer} 
                      icon={Code}
                    />
                  </div>

                  {/* Detailed Answer (Standard Style) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <ListTodo className="text-white" />
                        {isKm ? 'ដំណោះស្រាយលម្អិត' : 'Detailed Solution'}
                      </h3>
                      <button
                        onClick={handleCopyDetailed}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          detailedCopied
                            ? 'bg-white/20 text-white'
                            : 'bg-white/[0.07] hover:bg-white/15 text-white'
                        }`}
                        title={isKm ? 'ចម្លងដំណោះស្រាយលម្អិតជាអត្ថបទស្អាត' : 'Copy detailed solution as clean text'}
                      >
                        {detailedCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-white" />
                            <span>{isKm ? 'ចម្លងដំណោះស្រាយ' : 'Copy Solution'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-white/[0.05] rounded-2xl border border-white/10 p-4 sm:p-8 w-full min-w-0 overflow-x-auto">
                      <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-white/95 leading-relaxed font-kh-content w-full">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {result.detailed_answer}
                        </Markdown>
                      </div>
                    </div>
                  </div>

                  {/* Formulas Used (Terminal Style) */}
                  <div className="space-y-3 pt-4">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2 px-1">
                      <Calculator className="text-white" />
                      {isKm ? 'រូបមន្តដែលបានប្រើ' : 'Formulas Used'}
                    </h3>
                    <TerminalBox 
                      title="formulas.tex" 
                      content={result.formulas_used} 
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

