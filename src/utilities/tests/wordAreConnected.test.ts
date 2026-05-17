import { wordsAreConnected } from "../wordAreConnected";

it("should return that a and at are connected", () => {
  expect(wordsAreConnected("a", "at")).toBe(true);
});
it("should return that hat and bot are not connected", () => {
  expect(wordsAreConnected("hat", "bot")).toBe(false);
});
