import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });

export const generateBackstory = async (name: string, characterClass: string, race: string, background: string, theme: string = "High Fantasy D&D 5e") => {
  const prompt = `Generate a compelling character backstory for ${name}, a ${race} ${characterClass} with the background ${background}. Keep it under 300 words. Focus on their motivation for adventuring and a key person from their past. Adapt the lore, flavor, and setting details to fit this campaign theme: ${theme}.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
};

export const generatePortrait = async (description: string, theme: string = "High Fantasy") => {
  const prompt = `Character portrait: ${description}. Theme/Setting: ${theme}. High quality, epic atmosphere.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateCharacterDetails = async (inspiration: string) => {
  const prompt = `Based on the prompt "${inspiration}", suggest a D&D 5e Character: Name, Race, Class, Background, and a 1-sentence personality trait. Return valid JSON.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          race: { type: Type.STRING },
          class: { type: Type.STRING },
          background: { type: Type.STRING },
          personality: { type: Type.STRING },
        },
        required: ["name", "race", "class", "background", "personality"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const analyzeAction = async (name: string, description: string, theme: string = "High Fantasy D&D 5e") => {
  const prompt = `Analyze this action (Spell or Item) and extract its mechanical statistics. Frame the effectSummary fitting the theme: ${theme}.
  Action: ${name}
  Text: ${description}
  
  Return JSON with:
  - type: "attack", "save", or "utility"
  - dice: The primary damage or healing dice string (e.g., "1d8", "3d6"). If scaling, provide the base level dice.
  - damageType: Type of damage or "healing" (e.g., "fire", "piercing", "healing").
  - saveAttr: If type is "save", which attribute? (e.g., "DEX", "WIS").
  - range: Range string (e.g., "60ft", "Self", "Touch").
  - effectSummary: A punchy, 1-2 sentence atmospheric description of the mechanics/flavor for the player to read to the DM.
  - scaling: (Optional) How it scales at higher levels or with stronger attacks.
  - requiresAttunement: boolean (True if the item requires attunement to use its properties).
  - attributeBonuses: { str?: number, dex?: number, con?: number, int?: number, wis?: number, cha?: number } (Additive bonuses to stats, e.g., { "str": 2 }).
  - attributeOverrides: { str?: number, dex?: number, con?: number, int?: number, wis?: number, cha?: number } (Sets a stat to a specific value if higher, e.g., "belt of giant strength" sets str to 21. { "str": 21 }).
  - attachedSpells: string[] (List of names of spells this item allows you to cast, e.g., ["Web", "Spider Climb"]).

  Example for "Fireball": { "type": "save", "dice": "8d6", "damageType": "fire", "saveAttr": "DEX", "range": "150ft", "effectSummary": "A bright streak flashes from your pointing finger to a point you choose within range then blossoms with a low roar into an explosion of flame.", "scaling": "+1d6 per level above 3rd" }`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             type: { type: Type.STRING, enum: ["attack", "save", "utility"] },
             dice: { type: Type.STRING },
             damageType: { type: Type.STRING },
             saveAttr: { type: Type.STRING },
             range: { type: Type.STRING },
             effectSummary: { type: Type.STRING },
             scaling: { type: Type.STRING },
             requiresAttunement: { type: Type.BOOLEAN },
             attributeBonuses: {
               type: Type.OBJECT,
               properties: {
                 str: { type: Type.INTEGER },
                 dex: { type: Type.INTEGER },
                 con: { type: Type.INTEGER },
                 int: { type: Type.INTEGER },
                 wis: { type: Type.INTEGER },
                 cha: { type: Type.INTEGER }
               }
             },
             attributeOverrides: {
               type: Type.OBJECT,
               properties: {
                 str: { type: Type.INTEGER },
                 dex: { type: Type.INTEGER },
                 con: { type: Type.INTEGER },
                 int: { type: Type.INTEGER },
                 wis: { type: Type.INTEGER },
                 cha: { type: Type.INTEGER }
               }
             },
             attachedSpells: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
             }
          },
          required: ["type", "dice", "damageType", "effectSummary"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Action Analysis Error:", error);
    return null;
  }
};

export const generateClassFeatures = async (characterClass: string, subclass: string, level: number, theme: string = "High Fantasy D&D 5e") => {
  const prompt = `Identify the class and subclass features for a Level ${level} ${characterClass} (${subclass || 'No Subclass'}). Adapt the flavor and naming conventions of the features to fit a ${theme} setting if possible while keeping mechanics standard.
  
  Return JSON with:
  - features: An array of objects, each containing:
    - name: Name of the feature (e.g., "Cunning Action", "Divine Smite").
    - source: "Class" or "Subclass".
    - level: The level this feature is attained.
    - entries: An array of strings describing the feature.
    - dice: (Optional) Any dice associated with the feature (e.g., "1d6").
    - usage: (Optional) Any usage limits (e.g., "1/long rest").
  
  Only include features that are typically tracked on a character sheet.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            features: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  source: { type: Type.STRING },
                  level: { type: Type.INTEGER },
                  entries: { type: Type.ARRAY, items: { type: Type.STRING } },
                  dice: { type: Type.STRING },
                  usage: { type: Type.STRING },
                },
                required: ["name", "source", "level", "entries"]
              }
            }
          },
          required: ["features"]
        }
      }
    });

    return JSON.parse(response.text || '{ "features": [] }');
  } catch (error) {
    console.error("AI Class Feature Generation Error:", error);
    return { features: [] };
  }
};

export const explainActionEffect = async (name: string, description: string, theme: string = "High Fantasy D&D 5e") => {
  const prompt = `You are a DM's helper. Summarize the mechanical effects and flavor of this action (Spell or Item) into a single, punchy paragraph.
  Focus on:
  1. What happens on a hit or success (damage, conditions, special mechanics).
  2. Any secondary effects (e.g., stunned, poisoned, healing).
  3. Any costs or limitations.
  Keep it under 60 words and make it sounds atmospheric, fitting the campaign theme: ${theme}.
  
  Action Name: ${name}
  Description: ${description}`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Action Explanation Error:", error);
    return null;
  }
};
