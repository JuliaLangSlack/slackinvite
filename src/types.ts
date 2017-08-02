export interface User {
  email?: string
  name?: {first: string, last: string}
  is_admin?: boolean
  login?: string
  id?: string
}
