
export type FilePath = string;

export interface Location {
  line: number;
  column: number;
  file: FilePath;
}

export type Result = LocatedNumber | LocatedArray;

export interface LocatedNumber {
  value: number;
  location: Location;
}

export interface LocatedArray {
  value: Result[];
  location: Location;
}
