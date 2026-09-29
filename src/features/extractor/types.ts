export interface OrderRow {
  id: number
  name: string
  menu: string
  flagged: boolean
}

export type Mode = 'auto' | 'manual'

export interface ManualState {
  active: boolean
  text: string
  pos: number
  buildingName: string
  hasName: boolean
}

export const INITIAL_MANUAL_STATE: ManualState = {
  active: false,
  text: '',
  pos: 0,
  buildingName: '',
  hasName: false,
}
