# Mentor Feedback Session — March 14, 2026

## Key Insight: The Problem is Cost, Not Chaos

The original framing ("chaotic pre-production") is wrong. In real productions, nothing is chaotic — everything is highly calculated and budget-driven. The real problem is:

- **Cost of scouting**: Real productions hire dedicated scouts or specialized scouting agencies. They travel to multiple locations, evaluate each one, and present options from a catalog.
- **Cost of validation**: Even after picking a location, the Director of Photography must physically travel there to assess if it works — lighting, camera angles, layout feasibility.
- **Cost of coordination**: Every stakeholder (director, DP, AD, gaffer, costume, stunts) must be physically present in the same room or on-site to agree on the plan. Scheduling these meetings is expensive.
- **Cost of iteration**: Each round of feedback requires another site visit.

## Refined Value Proposition

**"Be there before being there."**

The core promise is almost magical: you can validate, plan, and align on a real physical location without anyone traveling there. That's the pitch — not "prettier 3D" or "VR tech demo."

### Three Metrics to Say Out Loud
1. **Time to approved plan** — compresses the entire pre-production location workflow
2. **Issues caught before shoot day** — sightlines, clearances, lighting, camera coverage
3. **Scout trips avoided** — direct cost savings (travel, time, agency fees)

### Proposed Tagline Direction
- Avoid "in 3D" and "in VR" in the main tagline — those describe technology, not value
- Focus on the impossible-sounding promise: being there without being there
- **"Stay in your budget by being there before being there"** — describes both the problem and solution in one line

## Target Audience: Refined

### Primary: Director of Photography (DP/DoP)
- The DP is the person who must validate locations for camera feasibility
- They create the first draft of how production will play out at a location
- They need to communicate their plan to the entire crew

### But Really: Everyone in Production
- The tool becomes a **communication blueprint** — even if the director plans in it, the purpose is to communicate to others what the plan is
- Costume designers see the location and plan wardrobe accordingly
- Stunt coordinators assess the space for safety
- The AD converts the plan into actionable shoot logistics
- Stakeholders who can't travel can still participate in decision-making

### Key Realization: Budget Implies Professional Production
- If you're scouting and planning layout, you're already at a professional level
- Indie filmmakers shooting in someone's apartment aren't the target
- The target is productions with real budgets where scouting costs are meaningful

## Use Case Reframe

### Before Shot Caller
1. Hire scouting agency or scout yourself → travel to multiple locations
2. Present locations to director/DP → more travel for validation visits
3. DP goes on-site → assesses camera feasibility, lighting, layout
4. Schedule in-person meeting → get all stakeholders in same room
5. Show storyboards, shot lists, diagrams → try to agree
6. If changes needed → repeat steps 2-5

### With Shot Caller
1. Generate 3D reconstructions of candidate locations from address/photos
2. DP creates their playlist of locations to show the director
3. **Invite stakeholders into the virtual location** — no travel needed
4. Discuss, validate, and agree inside the space together
5. Everyone sees the same blueprint — costume, stunts, camera, lighting
6. Export the approved plan → AD converts to call sheet

## The "Wow Moment" — Adjusted

Not: "Standing inside a street you generated from a laptop"

**Yes: "Validating with stakeholders and being able to quickly agree upon the location and operations before doing it physically"**

The wow is collaborative validation, not solo VR tourism.

## Technical Pipeline Update

### SVD 360 Integration
- Instead of using NarrowBanana or other image generation models to create input images
- Use **SVD 360** (https://svd360.com/) to generate 360-degree views from location photos
- This feeds the World Labs Marble API more effectively for accurate Gaussian splats
- Flow: Location photos → SVD 360 → 360 panorama → World Labs API → .spz Gaussian splat

## Production Elements (On Desktop Editor)
- Basic camera placement
- 3-point lighting setup
- Actor positions
- Grid gear
- Craft services area

## VR Experience (On PICO)
- Semi-aerial overview of the set
- Instant VR walkthrough
- The ability to "jump inside the place" for validation
- Stakeholder collaboration — invite the crew to walk through together

## What This Is NOT
- This is not a replacement for all pre-production tools
- It's one tool among many — specifically for **agreeing on location plans**
- The output is a **blueprint** that the rest of the crew builds upon
- It doesn't eliminate in-person work; it eliminates unnecessary in-person work

## Closing Line (Refined)
"Shot Caller compresses location scouting, blocking, and validation into a single workflow — so instead of figuring it out on set, crews show up with the plan already tested."
