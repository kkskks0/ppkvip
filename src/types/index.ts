export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export type { User } from './user'
export type { Report, AnalysisResult, ColorInfo, ShapeInfo, SizeInfo, TextureInfo, CompositionInfo, PatternInfo, QuantityInfo } from './report'
export type { Payment } from './payment'
