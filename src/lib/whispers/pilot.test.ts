import { describe,it,expect } from "vitest";
import { pilotSubmitSchema, publicationProblems } from "./pilot-schema";
const body={text:"Fictional clinic temporarily closed.",category:"health",knowledgeBasis:"saw",countryCode:"UA",areaId:"unknown",timeBucket:"today",impacts:["healthcare"],publicSummaryPermission:false,acknowledged:true};
describe("connected pilot release boundaries",()=>{
  it("rejects intake without the fictional test confirmation",()=>{expect(pilotSubmitSchema.safeParse({payload:body,codeHash:"a".repeat(64),idempotencyKey:"test-key-123",fictional:false}).success).toBe(false);});
  it("accepts only hashed 160-bit private codes, not the raw code",()=>{expect(pilotSubmitSchema.safeParse({payload:body,codeHash:"ABCDEFGHABCDEFGHABCDEFGHABCDEFGH",idempotencyKey:"test-key-123",fictional:true}).success).toBe(false);});
  it("blocks publication without the contributor permission",()=>{expect(publicationProblems({revoked_at:null,expires_at:"2030-01-01",body:{publicSummaryPermission:false}},0)).toContain("The contributor did not allow public use.");});
  it("blocks restricted reports from publication",()=>{expect(publicationProblems({revoked_at:null,expires_at:"2030-01-01",body:{publicSummaryPermission:true,sensitivity:"restricted"}},0)).toContain("Restricted reports cannot be published.");});
  it("blocks expired source reports",()=>{expect(publicationProblems({revoked_at:null,expires_at:"2020-01-01",body:{publicSummaryPermission:true}},Date.parse("2026-11-08"))).toContain("The source report is removed or expired.");});
});