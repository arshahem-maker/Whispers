import { describe,it,expect } from "vitest";
import { invitationSchema,canInvite } from "./staff-invitations";
describe("workspace invitations",()=>{
  it("permits a reviewer invitation only within the administrator workspace",()=>{expect(canInvite(["ua"],"ua")).toBe(true);expect(canInvite(["ua"],"td")).toBe(false);});
  it("does not invite administrators or accept multiple workspaces",()=>{expect(invitationSchema.safeParse({email:"expert@example.org",role:"admin",workspace:"ua"}).success).toBe(false);expect(invitationSchema.safeParse({email:"expert@example.org",role:"expert",workspace:["ua","td"]}).success).toBe(false);});
  it("normalizes email and allows experts for one workspace",()=>{expect(invitationSchema.parse({email:" Expert@Example.org ",role:"expert",workspace:"td"})).toEqual({email:"expert@example.org",role:"expert",workspace:"td"});});
});