import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { hashPassword, verifyPassword } from '../lib/security';
import { generateStudentIdFromDob, pickNextAvailableStudentId } from '../utils/studentId';

const AuthContext = createContext(null);

const LOCAL_STORAGE_USER_KEY = 'wsd_current_user';
const LOCAL_STORAGE_STUDENTS_KEY = 'wsd_local_students_db';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authRequiredNotice, setAuthRequiredNotice] = useState(null);

  // Helper to retrieve local fallback database
  const getLocalStudents = () => {
    try {
      const db = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
      return db ? JSON.parse(db) : [];
    } catch {
      return [];
    }
  };

  // Helper to save to local fallback database
  const saveLocalStudent = (student) => {
    try {
      const list = getLocalStudents();
      const existingIdx = list.findIndex(
        (s) => s.student_id === student.student_id || s.email === student.email
      );
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...student };
      } else {
        list.push(student);
      }
      localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(list));
    } catch {
      // Ignore local storage error
    }
  };

  // Save session when user changes
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    } catch {
      // Ignore
    }
  }, [currentUser]);

  /**
   * Register a new student with auto-generated DOB-based Student ID & secure password hashing
   */
  const register = async (studentData) => {
    setIsAuthLoading(true);
    try {
      const baseStudentId = generateStudentIdFromDob(studentData.date_of_birth);
      if (!baseStudentId) {
        throw new Error('សូមជ្រើសរើសថ្ងៃខែឆ្នាំកំណើតឱ្យបានត្រឹមត្រូវ!');
      }

      const normalizedEmail = studentData.email.trim().toLowerCase();
      const localList = getLocalStudents();

      // Gather already-used Student IDs matching this DOB base from local storage
      const takenIds = new Set(
        localList
          .map((s) => (s.student_id ? String(s.student_id).toUpperCase() : ''))
          .filter(Boolean)
      );

      // Also check Supabase for existing Student IDs with same DOB prefix
      if (supabase && isSupabaseConfigured) {
        const { data: existingRows } = await supabase
          .from('students')
          .select('student_id')
          .ilike('student_id', `${baseStudentId}%`);

        if (Array.isArray(existingRows)) {
          existingRows.forEach((row) => {
            if (row?.student_id) {
              takenIds.add(String(row.student_id).toUpperCase());
            }
          });
        }
      }

      let assignedStudentId = pickNextAvailableStudentId(baseStudentId, takenIds);
      const hashedPassword = await hashPassword(studentData.password);

      const recordToStore = {
        ...studentData,
        student_id: assignedStudentId,
        email: normalizedEmail,
        password: hashedPassword, // Store cryptographically hashed digest locally
        password_hash: hashedPassword,
      };

      // If Supabase is connected, insert into Supabase (retry suffix if rare race collision on student_id)
      if (supabase && isSupabaseConfigured) {
        let insertedData = null;
        let lastError = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data, error } = await supabase
            .from('students')
            .insert([
              {
                student_id: assignedStudentId,
                last_name: studentData.last_name.trim(),
                first_name: studentData.first_name.trim(),
                gender: studentData.gender,
                date_of_birth: studentData.date_of_birth,
                grade: studentData.grade,
                classroom: studentData.classroom.trim(),
                address: studentData.address.trim(),
                email: normalizedEmail,
                phone: studentData.phone.trim(),
                telegram: studentData.telegram ? studentData.telegram.trim() : null,
                password: hashedPassword,
                role: studentData.role || 'student',
              },
            ])
            .select()
            .single();

          if (!error) {
            insertedData = data;
            lastError = null;
            break;
          }

          lastError = error;
          if (error.code === '23505') {
            const errText = `${error.message || ''} ${error.details || ''}`.toLowerCase();
            if (errText.includes('student_id')) {
              takenIds.add(assignedStudentId.toUpperCase());
              assignedStudentId = pickNextAvailableStudentId(baseStudentId, takenIds);
              recordToStore.student_id = assignedStudentId;
              continue;
            }
            if (errText.includes('email')) {
              throw new Error('អ៊ីម៉ែលនេះមានក្នុងប្រព័ន្ធរួចហើយ!');
            }
            throw new Error('លេខសម្គាល់សិស្ស ឬ អ៊ីម៉ែលនេះមានក្នុងប្រព័ន្ធរួចហើយ!');
          } else {
            console.warn('Supabase insert notice:', error.message);
            break;
          }
        }

        if (lastError && lastError.code === '23505') {
          throw new Error('លេខសម្គាល់សិស្ស ឬ អ៊ីម៉ែលនេះមានក្នុងប្រព័ន្ធរួចហើយ!');
        }

        if (insertedData) {
          recordToStore.id = insertedData.id;
        }
      }

      // Persist locally and authenticate user
      saveLocalStudent(recordToStore);
      setCurrentUser(recordToStore);
      setIsAuthLoading(false);
      return { success: true, user: recordToStore };
    } catch (err) {
      setIsAuthLoading(false);
      return { success: false, error: err.message || 'ការចុះឈ្មោះមានបញ្ហា សូមព្យាយាមម្តងទៀត' };
    }
  };

  /**
   * Login with Student ID & Password using secure hash verification
   */
  const login = async (studentId, password) => {
    setIsAuthLoading(true);
    const cleanId = studentId.trim();

    try {
      let matchedUser = null;

      // 1. Try querying Supabase if configured
      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .ilike('student_id', cleanId)
          .maybeSingle();

        if (!error && data) {
          const isValid = await verifyPassword(
            password,
            data.password_hash || data.password
          );
          if (isValid) {
            matchedUser = data;
          }
        }
      }

      // 2. Fallback to Local Database
      if (!matchedUser) {
        const localList = getLocalStudents();
        const candidate = localList.find(
          (s) => s.student_id && s.student_id.toLowerCase() === cleanId.toLowerCase()
        );

        if (candidate) {
          const isValid = await verifyPassword(
            password,
            candidate.password_hash || candidate.password
          );
          if (isValid) {
            matchedUser = candidate;
          }
        }
      }

      // 3. Fallback demo admin account check
      if (!matchedUser && cleanId === 'STU-12001' && password === '123456') {
        matchedUser = {
          student_id: 'STU-12001',
          last_name: 'សុវណ្ណ',
          first_name: 'សារ៉ូ',
          last_name_en: 'Sovann',
          first_name_en: 'Saro',
          gender: 'ប្រុស',
          date_of_birth: '2008-05-15',
          grade: 'ទី១២',
          classroom: '12A',
          address: 'រាជធានីភ្នំពេញ',
          email: 'sovansaro2025@gmail.com',
          phone: '012345678',
          telegram: '@sovansaro',
          role: 'admin',
        };
      }

      if (matchedUser) {
        setCurrentUser(matchedUser);
        setIsLoginOpen(false);
        setIsAuthLoading(false);
        return { success: true, user: matchedUser };
      } else {
        setIsAuthLoading(false);
        return {
          success: false,
          error: 'លេខសម្គាល់សិស្ស (Student ID) ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ!',
        };
      }
    } catch (err) {
      setIsAuthLoading(false);
      return { success: false, error: err.message || 'ការចូលគណនីមានបញ្ហា' };
    }
  };

  /**
   * Logout
   */
  const logout = () => {
    setCurrentUser(null);
  };

  /**
   * Change Password and persist securely to Database (Supabase) and local records
   */
  const changePassword = async (oldPassword, newPassword) => {
    setIsAuthLoading(true);
    try {
      if (!currentUser) throw new Error('សូមចូលគណនីជាមុនសិន!');

      // Verify old password against stored hash or credential
      let isOldPasswordValid = false;

      // 1. Check against currentUser in memory/session
      if (currentUser.password_hash || currentUser.password) {
        const isValid = await verifyPassword(
          oldPassword,
          currentUser.password_hash || currentUser.password
        );
        if (isValid) {
          isOldPasswordValid = true;
        }
      }

      // 2. Check against Supabase if currentUser password was not in memory or needed fresh verification
      if (!isOldPasswordValid && supabase && isSupabaseConfigured) {
        let fetchQuery = supabase.from('students').select('*');
        if (currentUser.id) {
          fetchQuery = fetchQuery.eq('id', currentUser.id);
        } else if (currentUser.student_id) {
          fetchQuery = fetchQuery.ilike('student_id', currentUser.student_id.trim());
        } else if (currentUser.email) {
          fetchQuery = fetchQuery.ilike('email', currentUser.email.trim());
        }

        const { data: dbUser, error: fetchErr } = await fetchQuery.maybeSingle();
        if (!fetchErr && dbUser) {
          const isValid = await verifyPassword(
            oldPassword,
            dbUser.password_hash || dbUser.password
          );
          if (isValid) {
            isOldPasswordValid = true;
          }
        }
      }

      // 3. Check against local DB fallback
      if (!isOldPasswordValid) {
        const localList = getLocalStudents();
        const candidate = localList.find(
          (s) =>
            (s.student_id && currentUser.student_id && s.student_id.toLowerCase() === currentUser.student_id.toLowerCase()) ||
            (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
        );
        if (candidate) {
          const isValid = await verifyPassword(
            oldPassword,
            candidate.password_hash || candidate.password
          );
          if (isValid) {
            isOldPasswordValid = true;
          }
        }
      }

      // Default demo account password fallback check
      if (!isOldPasswordValid && currentUser.student_id === 'STU-12001' && oldPassword === '123456') {
        isOldPasswordValid = true;
      }

      if (!isOldPasswordValid) {
        throw new Error('ពាក្យសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ! សូមពិនិត្យឡើងវិញ');
      }

      const nowIso = new Date().toISOString();
      const hashedPassword = await hashPassword(newPassword);

      const updatedUser = {
        ...currentUser,
        password: hashedPassword,
        password_hash: hashedPassword,
        updated_at: nowIso,
      };

      // A. Save to local database for immediate offline & persistent fallback
      saveLocalStudent(updatedUser);

      // B. Update in Supabase / Remote Database directly
      if (supabase && isSupabaseConfigured) {
        let updateBuilder = supabase
          .from('students')
          .update({
            password: hashedPassword,
            updated_at: nowIso,
          });

        if (currentUser.id) {
          updateBuilder = updateBuilder.eq('id', currentUser.id);
        } else if (currentUser.student_id) {
          updateBuilder = updateBuilder.eq('student_id', currentUser.student_id.trim());
        } else if (currentUser.email) {
          updateBuilder = updateBuilder.eq('email', currentUser.email.trim());
        }

        const { data, error } = await updateBuilder.select();
        if (error) {
          console.error('Supabase update error:', error);
          throw new Error(`បរាជ័យក្នុងការកែប្រែក្នុង Database: ${error.message}`);
        } else if (data && data.length > 0) {
          updatedUser.id = data[0].id;
        }
      }

      // Update active user state in React context & localStorage
      setCurrentUser(updatedUser);
      setIsAuthLoading(false);
      return { success: true };
    } catch (err) {
      setIsAuthLoading(false);
      return {
        success: false,
        error: err.message || 'ការប្តូរពាក្យសម្ងាត់មិនជោគជ័យ សូមព្យាយាមម្តងទៀត',
      };
    }
  };

  const updateProfile = async (updates) => {
    setIsAuthLoading(true);
    try {
      if (!currentUser) throw new Error('សូមចូលគណនីជាមុនសិន!');

      const nowIso = new Date().toISOString();
      const updatedUser = {
        ...currentUser,
        ...updates,
        updated_at: nowIso,
      };

      // A. Save to local database
      saveLocalStudent(updatedUser);

      // B. Update in Supabase
      if (supabase && isSupabaseConfigured) {
        let updateBuilder = supabase
          .from('students')
          .update({
            ...updates,
            updated_at: nowIso,
          });

        if (currentUser.id) {
          updateBuilder = updateBuilder.eq('id', currentUser.id);
        } else if (currentUser.student_id) {
          updateBuilder = updateBuilder.eq('student_id', currentUser.student_id.trim());
        } else if (currentUser.email) {
          updateBuilder = updateBuilder.eq('email', currentUser.email.trim());
        }

        const { data, error } = await updateBuilder.select();
        if (error) {
          console.error('Supabase update error:', error);
          throw new Error(`បរាជ័យក្នុងការកែប្រែក្នុង Database: ${error.message}`);
        } else if (data && data.length > 0) {
          updatedUser.id = data[0].id;
        }
      }

      setCurrentUser(updatedUser);
      setIsAuthLoading(false);
      return { success: true };
    } catch (err) {
      setIsAuthLoading(false);
      return {
        success: false,
        error: err.message || 'ការកែប្រែមិនជោគជ័យ សូមព្យាយាមម្តងទៀត',
      };
    }
  };

  const requireAuth = (featureName = '') => {
    if (!currentUser) {
      setAuthRequiredNotice(featureName);
      setIsRegisterOpen(true);
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        isAdmin: currentUser?.role === 'admin',
        isAuthLoading,
        isRegisterOpen,
        setIsRegisterOpen,
        isLoginOpen,
        setIsLoginOpen,
        authRequiredNotice,
        setAuthRequiredNotice,
        register,
        login,
        logout,
        changePassword,
        updateProfile,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
