import { UUID } from 'crypto'

type Export = {
  title: string
  totalQuestions: number
  totalAnnotations: number
  questions: Question[]
}
type Question = {
  id: UUID
  groupName: string
  questions: {
    id: UUID
    text?: string
    images?: URL
  }
  options: {
    id: UUID
    text?: string
    images?: URL
  }
  answers: {
    id: UUID
    text?: string
    images?: URL
  }
  others: {
    id: UUID
    text?: string
    images?: URL
  }
  parses: {
    id: UUID
    text?: string
    images?: URL
  }
}
