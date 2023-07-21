export * from "./pdas";
export * from "./merkleTree";
export * from "./lookupTables";

export function removeDuplicateFromArrayOf<T = any, C = any>(
  array: T[],
  uniqueField: string | ((obj: T) => C)
) {
  return array.filter(
    (x, i) =>
      i ===
      array.findIndex((y) => {
        if (typeof uniqueField === "string") {
          return x[uniqueField] === y[uniqueField];
        } else {
          return uniqueField(x) === uniqueField(y);
        }
      })
  );
}
