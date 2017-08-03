export interface User {
  email?: string
  name?: {first?: string, last?: string}
  is_admin?: boolean
  login?: string
  id?: string
  github?: string
}

export interface InviteRequest extends User {
  status?: string
}

export enum StatusCode {
  ACCEPTED,
  DENIED,
  PENDING
}
