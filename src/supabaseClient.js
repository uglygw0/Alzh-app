import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Vercel 환경 변수 누락: VITE_SUPABASE_URL 혹은 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. Vercel 대시보드에서 Environment Variables를 등록해주세요.');
}

// 환경 변수가 아예 등록되지 않았을 경우 앱 에러(흰 화면) 방지 처리를 위해 값이 있을 때만 작동하게 예외 처리합니다.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : {
      from: () => ({
        insert: () => {
          console.warn('Supabase DB가 연결되지 않아 데이터가 저장되지 않았습니다. Vercel 환경 변수를 확인해주세요.');
          return Promise.resolve();
        }
      })
    };
