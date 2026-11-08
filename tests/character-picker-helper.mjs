import { heroById } from "../src/heroes.js";
export const characterName = (id) => heroById[id]?.name || "";
export async function selectCharacter(page, id) {
  await page
    .getByRole("combobox", { name: "Build character", exact: true })
    .click();
  await page
    .getByRole("option", {
      name: characterName(id) || "Choose a character",
      exact: true,
    })
    .click();
}
