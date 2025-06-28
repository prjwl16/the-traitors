import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface GameContext {
  gameId: string
  currentPhase: 'DAY' | 'NIGHT'
  currentDay: number
  playerCount: number
  alivePlayerCount: number
  recentEvent?: string
}

export interface PlayerContext {
  name: string
  role: 'FAITHFUL' | 'TRAITOR'
  isAlive: boolean
}

export interface RoomInteractionContext {
  action: 'DESTROY' | 'CLEAN' | 'PLACE' | 'VISIT'
  objectName: string
  itemName?: string
  playerName: string
}

/**
 * Generate dramatic narration for game events
 */
export async function generateNarration(
  context: GameContext,
  recentEvent?: string
): Promise<string> {
  try {
    const systemPrompt = `You are a master storyteller for a social deduction game called "Whispers". 
    Generate dramatic, atmospheric narration that sets the mood for each phase. 
    Keep responses under 150 tokens. Use poetic, suspenseful language.
    Focus on the tension, mystery, and psychological drama of the game.`

    const userPrompt = `Generate narration for:
    - Phase: ${context.currentPhase}
    - Day: ${context.currentDay}
    - Players alive: ${context.alivePlayerCount}/${context.playerCount}
    ${recentEvent ? `- Recent event: ${recentEvent}` : ''}
    
    Create atmospheric narration that builds tension and immersion.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content || 'The shadows whisper of secrets yet to be revealed...'
  } catch (error) {
    console.error('Error generating narration:', error)
    return 'The shadows whisper of secrets yet to be revealed...'
  }
}

/**
 * Generate missions for players based on their role
 */
export async function generateMission(
  context: GameContext,
  player: PlayerContext
): Promise<string> {
  try {
    const systemPrompt = `You are a mission generator for a social deduction game. 
    Generate subtle, interesting social objectives that fit the player's role.
    Keep missions short (1-2 lines) and verifiable through social interaction.
    Missions should encourage roleplay and strategic thinking.`

    const roleGuidance = player.role === 'TRAITOR' 
      ? 'Create missions that help the traitor blend in or subtly manipulate without being obvious.'
      : 'Create missions that help the faithful gather information or build trust.'

    const userPrompt = `Generate a mission for:
    - Player role: ${player.role}
    - Game phase: ${context.currentPhase}
    - Day: ${context.currentDay}
    - Players alive: ${context.alivePlayerCount}
    
    ${roleGuidance}
    
    Examples:
    - Faithful: "Ask another player who they trust the most today."
    - Traitor: "Start a fake defense for someone without being too obvious."
    
    Generate one unique mission:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 50,
      temperature: 0.7,
    })

    return completion.choices[0]?.message?.content || 'Observe the other players carefully and take notes.'
  } catch (error) {
    console.error('Error generating mission:', error)
    return 'Observe the other players carefully and take notes.'
  }
}

/**
 * Generate chaos events to shake up the game
 */
export async function generateChaosEvent(context: GameContext): Promise<string> {
  try {
    const systemPrompt = `You are a chaos event generator for a social deduction game.
    Generate surprising, dramatic twists that shake up the game dynamics.
    Keep events short, clear, and impactful. Events should be game-changing but fair.`

    const userPrompt = `Generate a chaos event for:
    - Phase: ${context.currentPhase}
    - Day: ${context.currentDay}
    - Players alive: ${context.alivePlayerCount}/${context.playerCount}
    
    Examples:
    - "Double elimination today - two players will be banished!"
    - "One random vote will be ignored this round."
    - "The next player to speak must reveal their role."
    - "All votes are anonymous this round."
    
    Generate one unique chaos event:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 40,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content || 'The winds of change stir through the game...'
  } catch (error) {
    console.error('Error generating chaos event:', error)
    return 'The winds of change stir through the game...'
  }
}

/**
 * Generate poetic room interaction logs
 */
export async function generateRoomInteractionLog(
  context: RoomInteractionContext
): Promise<string> {
  try {
    const systemPrompt = `You are a poetic narrator for room interactions in a mystery game.
    Generate short, atmospheric descriptions of player actions with symbolic objects.
    Use metaphorical language that hints at deeper meaning. Keep responses under 30 tokens.`

    const userPrompt = `Describe this action poetically:
    - Action: ${context.action}
    - Object: ${context.objectName}
    ${context.itemName ? `- Item placed: ${context.itemName}` : ''}
    
    Create a mysterious, symbolic description:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 30,
      temperature: 0.9,
    })

    return completion.choices[0]?.message?.content || `The ${context.objectName.toLowerCase()} bears witness to another secret.`
  } catch (error) {
    console.error('Error generating room interaction log:', error)
    return `The ${context.objectName.toLowerCase()} bears witness to another secret.`
  }
}

export default openai
