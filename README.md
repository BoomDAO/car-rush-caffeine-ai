# Car Rush 2D Game

## Overview
Car Rush is a 2D web game where players control a CSS-rendered car on an infinitely extending zig-zag road to collect coins and increase their score. The game requires Internet Identity authentication and features ICP and BOOM DAO branding.

## Authentication
- Users must log in using Internet Identity authentication to access the game
- Display user's authenticated identity in the interface
- Display the user's principal ID in the bottom corner of the game screen with a copy button next to it for easy copying

## Connect to BOOM Gaming Guilds
- As soon as user will log in, they will see a screen to connect their Boom Gaming Guilds principal id to Caffeine AI game. 
- This function will actually map BGG principal id corresponding to Caffeine AI game, and this will later be used to call processAction method on Boom Gaming Guilds world canister of the game, to mark BGG game quest action completed and make BGG game quest claimable for user who played the game and completed quest action.

## Game Flow
- After authentication using Internet Identity and user's connecting their Boom Gaming Guilds account, users see a menu screen with a "Start Playing" button.
- Clicking "Start Playing" must properly transition from the menu screen to the game screen.
- The game loop must start immediately when transitioning to the game screen
- All game state variables must be properly initialized when starting the game
- Keyboard event listeners for game controls must be properly attached when the game starts
- Game state reset functionality to ensure clean game initialization on each new game.

## Game Mechanics
- 2D game with a zig-zag road layout that extends infinitely as the car progresses
- Car rendered entirely using CSS (no image assets) positioned on the road with its front bonnet pointing upward (toward the top of the screen) when accelerating
- Car moves forward at double speed when spacebar is pressed (manual movement control with increased acceleration and forward movement speed)
- Player controls car turning using keyboard arrow keys (left/right) for road navigation
- Car can turn left and right to navigate the zig-zag road and collect coins
- Road automatically extends when the car approaches the end of the visible road section, creating infinite forward movement
- Coins are placed at various positions along the extending road
- Collecting coins increases the player's score
- Game ends when player reaches a score of 20,000
- If the car moves outside the road boundaries (beyond the green border), the game stops and ends immediately
- Speed is displayed and updates as the car moves (reflecting the doubled movement speed)
- Game state (score, position, collected coins, speed) is maintained in the frontend only
- Responsive controls for smooth turning and forward movement at increased speed

## Integration with BOOM Gaming Guilds World canister and dedicated backend canister 
- When a user reaches a score of 300 coins, the frontend calls the world canister processAction method exactly once per game session
- The call is made exclusively using DFINITY's @dfinity/agent library with the authenticated user's identity (principal) and properly signed
- Before calling processAction, verify that the user's principal is not anonymous; if it is anonymous, prevent the call and display a clear notification error message
- All canister calls must be signed with the authenticated user's identity, with clear code comments explaining the authentication flow and principal verification
- The useProcessAction hook uses the agent and actor pattern for canister calls, passing the user's identity from the authentication context
- ActionArg parameters that are passed as arguments in the processAction method will be : 
        * actionId = "action_id as set by you in game world canister id" 
        * fields : [{ "fieldNamt": "target_principal_id"; "fieldValue": "user boom gaming guilds principal id which was mapped in the beginning of the user onboarding" }]
- The backend call must be triggered reliably at the 300-coin threshold (or whatever action threshold you will set in your game) with proper error handling and anonymous principal checking
- The user's principal must always be passed correctly as the caller through the DFINITY agent after verification
- When processAction is called, display a notification tile in the top right corner showing "You passed the winning score" and indicating that processAction is being called
- All errors from the processAction call must be logged to the browser console with detailed error information, filtering out unrelated network errors (like Datadog RUM)
- If processAction fails or if the principal is anonymous, display comprehensive error messages in the notification tile including the specific error details
- Along with BGG (BOOM Gaming Guilds) World canister there is a dedicated backend canister as well, which stores other information like mapping of principal ids and some other information. 

## Creation and Configuration of BOOM Gaming Guilds world canister for integration with Caffeine AI game
- Visit [BOOM Gaming Guilds website](https://awcae-maaaa-aaaam-abmyq-cai.icp0.io/) and go to DEV TOOLS -> DEPLOY WORLDS 
- Name your World canister and deploy a new world canister for your Caffeine AI game
- After deploying your Game World canister, open : http://5pati-hyaaa-aaaal-qb3yq-cai.raw.icp0.io/?id=${GameWorldCanisterId} and login using same NFID account as BGG account
- Now we need to call createAction method in this world canister and arguments passed in createAction endpoint will be same as below, where aid stands for actionId, eid stands for entityId and wid stands for worldId, you can name your eid, aid or cid according to your requirement like below. 

```
{"aid":"target_car_rush_won","callerAction":[],"targetAction":[{"actionConstraint":[],"actionResult":{"outcomes":[{"possibleOutcomes":[{"weight":100,"option":{"updateEntity":{"eid":"total_won_count","wid":[],"updates":[{"incrementNumber":{"fieldName":"count","fieldValue":{"number":1}}}]}}}]},{"possibleOutcomes":[{"weight":100,"option":{"updateEntity":{"eid":"total_played_count","wid":[],"updates":[{"incrementNumber":{"fieldName":"count","fieldValue":{"number":1}}}]}}}]},{"possibleOutcomes":[{"weight":100,"option":{"updateEntity":{"eid":"car_rush_won_count","wid":[],"updates":[{"incrementNumber":{"fieldName":"count","fieldValue":{"number":1}}}]}}}]},{"possibleOutcomes":[{"weight":100,"option":{"updateEntity":{"eid":"car_rush_played_count","wid":[],"updates":[{"incrementNumber":{"fieldName":"count","fieldValue":{"number":1}}}]}}}]}]}}],"worldAction":[]}
```

## User Interface
- Menu screen with "Start Playing" button that properly initializes and starts the game
- Main game screen displays the zig-zag road with the CSS-rendered car positioned on it
- Score counter displayed in the top left corner
- Car speed indicator displayed in the top left corner (showing doubled speed values)
- Notification tile in the top right corner that appears when processAction is called, showing success message or comprehensive error details with robust error logging, including anonymous principal warnings
- User's principal ID displayed in the bottom corner with a copy button for easy copying
- ICP and BOOM DAO branding elements visible in the background
- CSS-rendered car incorporates ICP/BOOM DAO branding elements in its styling
- Road view with coins placed throughout the layout that extends as the car progresses
- App content language: English

## Technical Requirements
- Responsive design for desktop browsers
- Proper screen transition from menu to game with complete game initialization
- Smooth keyboard input handling for car controls (arrow keys for turning, spacebar for forward movement at doubled speed)
- Collision detection between CSS-rendered car and coins
- Collision detection between car and road boundaries to trigger game end
- CSS-rendered car with proper orientation (front bonnet pointing upward) and ICP/BOOM DAO styling
- Infinite road generation system that extends the road as the car progresses
- Performance optimized for smooth gameplay with continuous road extension at increased movement speed
- Proper turn mechanics for zig-zag road navigation on infinitely extending layout with faster movement
- Backend integration exclusively using DFINITY's @dfinity/agent library with reliable processAction method call at 300-coin milestone, anonymous principal verification, comprehensive error handling, detailed console logging with filtered error messages, and proper user feedback
- Copy-to-clipboard functionality for principal ID
- Proper event listener management to ensure controls work correctly after game initialization
- Refactored hooks to guarantee exclusive use of @dfinity/agent for backend calls with proper principal verification and clear code documentation
