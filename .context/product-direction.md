# Shot Caller — Refined Product Direction

## One-Line Pitch
"Stay in your budget by being there before being there."

## Problem Statement (Refined)
Film production scouting and location planning is expensive — not chaotic. Professional productions hire scouting agencies, send the DP to validate locations in person, and coordinate in-room meetings with all stakeholders. Every round of feedback requires another site visit. The cost is in travel, time, and the difficulty of getting distributed stakeholders aligned on a shared plan.

## Solution Statement
Shot Caller lets production teams validate, plan, and align on real shooting locations virtually. Generate a 3D reconstruction of any real address, lay out your camera crew and equipment on desktop, then invite stakeholders to walk the space together — no travel required. The output is a production-ready blueprint the entire crew can build upon.

## Target Audience
- **Primary**: Director of Photography (DP/DoP) — validates locations, plans camera/lighting
- **Secondary**: All production stakeholders (director, AD, gaffer, costume, stunts)
- **Market**: Professional productions with real budgets (not indie/apartment shoots)

## Core Value Props
1. **Eliminate unnecessary scout trips** — validate locations from anywhere
2. **Compress stakeholder alignment** — invite distributed teams into the same virtual space
3. **Catch issues before shoot day** — sightlines, clearances, lighting, camera coverage
4. **Protect the budget** — reduce pre-production travel and iteration costs

## Key Metrics (For Pitch)
1. Time to approved plan
2. Issues caught before shoot day
3. Scout trips avoided

## Technical Pipeline
1. Location photos/address → SVD 360 (https://svd360.com/) → 360 panorama
2. 360 panorama → World Labs Marble API → .spz Gaussian splat
3. Desktop Web3D editor (Three.js + SparkJS) → place cameras, lights, crew, equipment
4. Same URL on PICO → immersive VR walkthrough at real scale
5. Export → shareable 3D URL + PDF floor plan for AD

## Demo Location
San Francisco — Golden Gate Bridge area (not NYC)

## Tagline Guidelines
- Avoid "in 3D" and "in VR" — these describe tech, not value
- Focus on the magical promise: being there without being there
- The tagline should describe both the problem and the solution

## The Wow Moment
Not solo VR tourism. The wow is: **collaborative validation** — stakeholders agreeing on a location and plan without anyone traveling there.
