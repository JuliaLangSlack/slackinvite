declare namespace Hi {
  export interface X {
    a:any
  }
}

declare namespace Hi {
  export interface X {
    b:any
  }
}

let b:Hi.X = {a:1, b:2}
