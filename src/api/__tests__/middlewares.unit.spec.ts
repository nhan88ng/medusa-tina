import fs from "fs"
import path from "path"

const MIDDLEWARES_PATH = path.join(__dirname, "../middlewares.ts")
const content = fs.readFileSync(MIDDLEWARES_PATH, "utf8")

describe("middlewares.ts — search route registration", () => {
  it("registers /store/search matcher", () => {
    expect(content).toMatch(/matcher.*\/store\/search/)
  })

  it("registers search route as GET method — anchored to the /store/search entry", () => {
    // Anchors method:GET within 60 chars of the /store/search matcher so a
    // different GET route elsewhere in the file cannot cause a false positive.
    expect(content).toMatch(/\/store\/search[\s\S]{0,60}method.*GET/)
  })

  it("marks search as isList: false (not a Medusa paginated list)", () => {
    // Search returns MeiliSearch hits in a custom shape, not a Medusa list.
    // isList: false prevents accidental list-transform behaviour.
    expect(content).toMatch(/isList:\s*false/)
  })
})
