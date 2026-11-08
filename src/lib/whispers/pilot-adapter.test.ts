import { describe, it, expect } from "vitest";
import { pilotContributorView } from "./pilot-adapter";
const receipt = {text:"Fictional report",area:"Not shared",state:"received",removalRequested:false,messages:[],photos:0,time:"today" as const,receivedAt:"2026-11-08T09:00:00Z"};
describe("connected citizen follow-up",()=>{
  it("maps a reviewer request for information to the contributor status",()=>{expect(pilotContributorView({...receipt,state:"awaiting_contributor"})?.status).toBe("more_info");});
  it("keeps removal confirmation and blocks unavailable receipts",()=>{expect(pilotContributorView({...receipt,removalRequested:true})?.removalRequested).toBe(true);expect(pilotContributorView(null)).toBeNull();});
  it("retains the event time and reviewer reply without private staff IDs",()=>{const v=pilotContributorView({...receipt,messages:[{id:"reply",text:"Fictional reply",sender:"reviewer",at:receipt.receivedAt}]});expect(v?.timeBucket).toBe("today");expect(v?.messages[0]).toEqual({id:"reply",text:"Fictional reply",sender:"reviewer",createdAt:receipt.receivedAt});});
});