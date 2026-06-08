export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

export interface Question {
  id: number
  bank_id: number
  question_type: 'single' | 'multiple' | 'truefalse' | 'fill'
  content: string
  options?: string
  answer: string
  analysis?: string
  category?: string
  difficulty?: number
  created_at: string
  updated_at: string
  bank_name?: string
}

export interface QuestionBank {
  id: number
  name: string
  description?: string
  question_count?: number
  created_at: string
  updated_at: string
}

export interface QuestionOption {
  label: string
  text: string
}

export interface PracticeSession {
  id: number
  user_id: number
  bank_id?: number
  type: 'quick' | 'bank' | 'category' | 'favorite' | 'wrong'
  category?: string
  total_questions: number
  correct_count: number
  status: 'in_progress' | 'completed'
  started_at: string
  finished_at?: string
  questions_json?: string
  current_question_index?: number
}

export interface PracticeHistory {
  id: number
  user_id: number
  question_id: number
  bank_id: number
  user_answer: string
  is_correct: number
  created_at: string
  session_id?: number
}

export interface Stats {
  total_questions: number
  total_practices: number
  correct_rate: number
  streak_days: number
  last_practice_date: string
  today_practices: number
  banks_count: number
  favorites_count: number
}
