import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";
import { sendAffirmationReminder } from "./twilio";
import { 
  getAgentSystemPrompt, 
  getAgentConfig, 
  refreshAgentConfig, 
  getAllAgents, 
  getAgentConfigById,
  AGENT_IDS,
  behavioralSearch,
  clearAgentCache
} from "./agentforge";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth First
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register Integration Routes
  registerChatRoutes(app);
  registerImageRoutes(app); // We'll wrap this with auth for custom endpoints if needed

  // === APP ROUTES ===

  // Goals
  app.get(api.goals.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const goals = await storage.getGoals(userId);
    res.json(goals);
  });

  app.post(api.goals.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.goals.create.input.parse(req.body);
      const goal = await storage.createGoal({ ...input, userId });
      res.status(201).json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.goals.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.goals.update.input.parse(req.body);
      const goal = await storage.updateGoal(Number(req.params.id), input);
      res.json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.goals.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteGoal(Number(req.params.id));
    res.status(204).send();
  });


  // Affirmations
  app.get(api.affirmations.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const affirmations = await storage.getAffirmations(userId);
    res.json(affirmations);
  });

  app.post(api.affirmations.create.path, isAuthenticated, async (req, res) => {
     try {
      const userId = (req.user as any).claims.sub;
      const input = api.affirmations.create.input.parse(req.body);
      const affirmation = await storage.createAffirmation({ ...input, userId });
      res.status(201).json(affirmation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.affirmations.generate.path, isAuthenticated, async (req, res) => {
    try {
      const { theme, mood } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a helpful manifestation coach. Generate a single, powerful, positive affirmation."
          },
          {
            role: "user",
            content: `Generate a short, powerful affirmation${theme ? ` about ${theme}` : ''}${mood ? ` for when I am feeling ${mood}` : ''}. Return only the affirmation text.`
          }
        ],
        max_completion_tokens: 100
      });

      const affirmation = response.choices[0].message.content || "I am capable of achieving anything I set my mind to.";
      res.json({ affirmation });

    } catch (error) {
      console.error("Error generating affirmation:", error);
      res.status(500).json({ message: "Failed to generate affirmation" });
    }
  });


  // Journal
  app.get(api.journal.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const entries = await storage.getJournalEntries(userId);
    res.json(entries);
  });

  app.post(api.journal.create.path, isAuthenticated, async (req, res) => {
     try {
      const userId = (req.user as any).claims.sub;
      const input = api.journal.create.input.parse(req.body);
      const entry = await storage.createJournalEntry({ ...input, userId });
      res.status(201).json(entry);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });


  // Vision Boards
  app.get(api.visionBoards.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const boards = await storage.getVisionBoards(userId);
    res.json(boards);
  });

  app.get(api.visionBoards.get.path, isAuthenticated, async (req, res) => {
    const board = await storage.getVisionBoard(Number(req.params.id));
    if (!board) {
      return res.status(404).json({ message: "Vision board not found" });
    }
    res.json(board);
  });

  app.post(api.visionBoards.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.visionBoards.create.input.parse(req.body);
      const board = await storage.createVisionBoard({ ...input, userId });
      res.status(201).json(board);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.visionBoards.addImage.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.visionBoards.addImage.input.parse(req.body);
      const image = await storage.addVisionBoardImage({ ...input, visionBoardId: Number(req.params.id) });
      res.status(201).json(image);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Proxy the image generation for vision boards to enforce auth/context if needed
  // Or just use the integration route directly if it was public (but we want it authenticated usually)
  // The integration route /api/generate-image is generic. Let's make a specific one that feels part of the app flow
  app.post(api.visionBoards.generateImage.path, isAuthenticated, async (req, res) => {
    try {
       const { prompt } = req.body;
       if (!prompt) return res.status(400).json({ message: "Prompt required" });

       const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      const imageData = response.data?.[0];
      
      // Handle both URL and base64 responses
      if (imageData?.url) {
        res.json({ imageUrl: imageData.url });
      } else if (imageData?.b64_json) {
        // Return as data URL for immediate display
        const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
        res.json({ imageUrl: dataUrl });
      } else {
        console.error("Image generation response:", JSON.stringify(response.data));
        return res.status(500).json({ message: "No image generated" });
      }
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });


  // Manifestation Advice (AI) - Using AgentForge agent config with goal context
  app.post(api.manifestation.getAdvice.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { situation, goal, goalId } = req.body;

      // If goalId provided, fetch full goal context
      let goalContext = goal || "General abundance/peace";
      let fullGoalDetails = "";
      
      if (goalId) {
        const userGoal = await storage.getGoal(goalId);
        if (userGoal && userGoal.userId === userId) {
          goalContext = userGoal.title;
          fullGoalDetails = `
Goal Details:
- Title: ${userGoal.title}
- Description: ${userGoal.description || 'Not specified'}
- Progress: ${userGoal.progress || 0}%
- Belief Level: ${Math.round((userGoal.beliefLevel || 50) / 10)}/10
- Evidence Notes: ${userGoal.evidenceNotes || 'None yet'}
- Milestones: ${userGoal.milestones?.map((m: any) => `${m.text} (${m.completed ? 'done' : 'pending'})`).join(', ') || 'None'}`;
        }
      }

      // Fetch user's active goals for broader context
      const userGoals = await storage.getGoals(userId);
      const activeGoals = userGoals
        .filter(g => (g.progress || 0) < 100)
        .slice(0, 3)
        .map(g => `- ${g.title} (${g.progress || 0}% complete)`);

      const agentPrompt = await getAgentSystemPrompt();
      const systemPrompt = `${agentPrompt}

USER'S ACTIVE GOALS:
${activeGoals.length > 0 ? activeGoals.join('\n') : 'No active goals yet'}
${fullGoalDetails}

Use this context to provide personalized, goal-aligned advice. Reference their specific goals when relevant.
      
Response Format (JSON):
{
  "advice": "string (2-3 paragraphs, personalized to their goals)",
  "suggestedAffirmations": ["string", "string", "string"],
  "suggestedActions": ["string", "string", "string"],
  "nextSteps": ["what to do next to progress toward their goal"]
}`;

      const userPrompt = `Current Situation: ${situation}\nTarget Goal: ${goalContext}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });

      const content = JSON.parse(response.choices[0].message.content || "{}");
      res.json(content);

    } catch (error) {
      console.error("Error getting advice:", error);
      res.status(500).json({ message: "Failed to get advice" });
    }
  });
  
  // Endpoint to get the current agent config (for display in UI)
  app.get("/api/agent-config", isAuthenticated, async (req, res) => {
    try {
      const config = await getAgentConfig();
      if (!config) {
        return res.status(404).json({ message: "Agent config not available" });
      }
      res.json({
        name: config.name,
        role: config.role,
        description: config.description.substring(0, 500) + "...",
        capabilities: config.capabilities.slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching agent config:", error);
      res.status(500).json({ message: "Failed to fetch agent config" });
    }
  });

  // Refresh agent config from AgentForge (clears cache)
  app.post("/api/agent-config/refresh", isAuthenticated, async (req, res) => {
    try {
      const agentId = req.body.agentId || AGENT_IDS.MANIFESTATION;
      const config = await refreshAgentConfig(agentId);
      if (!config) {
        return res.status(404).json({ message: "Agent config not available" });
      }
      console.log("[agentforge] Agent refreshed:", config.name);
      res.json({
        success: true,
        name: config.name,
        role: config.role,
        description: config.description?.substring(0, 500) + "...",
        capabilities: config.capabilities?.slice(0, 5) || [],
        hasCharacterBible: !!config.characterBible,
        hasConstitutionalRules: !!config.constitutionalRules
      });
    } catch (error) {
      console.error("Error refreshing agent config:", error);
      res.status(500).json({ message: "Failed to refresh agent config" });
    }
  });

  // Get all registered agents
  app.get("/api/agents", isAuthenticated, async (req, res) => {
    try {
      const agents = await getAllAgents();
      const agentList = Object.entries(agents).map(([key, config]) => ({
        key,
        id: config?.id,
        name: config?.name || "Not available",
        role: config?.role || "",
        available: !!config,
        hasCALM: !!(config?.characterBible || config?.constitutionalRules)
      }));
      res.json({ 
        agents: agentList,
        agentIds: AGENT_IDS
      });
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Get specific agent by ID
  app.get("/api/agents/:id", isAuthenticated, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      if (isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }
      const config = await getAgentConfigById(agentId);
      if (!config) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json({
        id: config.id,
        name: config.name,
        role: config.role,
        description: config.description,
        capabilities: config.capabilities,
        hasCharacterBible: !!config.characterBible,
        hasConstitutionalRules: !!config.constitutionalRules,
        characterBible: config.characterBible,
        constitutionalRules: config.constitutionalRules
      });
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // Refresh all agents from AgentForge
  app.post("/api/agents/refresh-all", isAuthenticated, async (req, res) => {
    try {
      clearAgentCache();
      const agents = await getAllAgents();
      const refreshed = Object.entries(agents)
        .filter(([_, config]) => config)
        .map(([key, config]) => ({
          key,
          name: config!.name,
          id: config!.id
        }));
      console.log("[agentforge] All agents refreshed:", refreshed.map(a => a.name).join(", "));
      res.json({ 
        success: true, 
        refreshed,
        message: `Refreshed ${refreshed.length} agents from AgentForge`
      });
    } catch (error) {
      console.error("Error refreshing all agents:", error);
      res.status(500).json({ message: "Failed to refresh agents" });
    }
  });

  // Behavioral search endpoint
  app.post("/api/behavioral-search", isAuthenticated, async (req, res) => {
    try {
      const { query, options } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      const result = await behavioralSearch(query, options || {});
      res.json(result);
    } catch (error) {
      console.error("Error performing behavioral search:", error);
      res.status(500).json({ message: "Failed to perform behavioral search" });
    }
  });

  // Agent Training Endpoints
  const { runTrainingTest, runTrainingSuite, getTrainingRecommendations } = await import("./agent-training");

  // Run a single training test
  app.post("/api/training/test", isAuthenticated, async (req, res) => {
    try {
      const { prompt, agentId } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Test prompt is required" });
      }
      const result = await runTrainingTest(prompt, agentId || AGENT_IDS.MANIFESTATION);
      res.json(result);
    } catch (error) {
      console.error("Error running training test:", error);
      res.status(500).json({ message: "Failed to run training test" });
    }
  });

  // Run full training suite
  app.post("/api/training/suite", isAuthenticated, async (req, res) => {
    try {
      const { agentId } = req.body;
      console.log("[training] Running training suite for agent:", agentId || AGENT_IDS.MANIFESTATION);
      const result = await runTrainingSuite(agentId || AGENT_IDS.MANIFESTATION);
      console.log("[training] Suite complete:", result.summary);
      res.json(result);
    } catch (error) {
      console.error("Error running training suite:", error);
      res.status(500).json({ message: "Failed to run training suite" });
    }
  });

  // Get training recommendations from Training Orchestrator
  app.post("/api/training/recommendations", isAuthenticated, async (req, res) => {
    try {
      const { results } = req.body;
      if (!results || !Array.isArray(results)) {
        return res.status(400).json({ message: "Training results array is required" });
      }
      const recommendations = await getTrainingRecommendations(results);
      res.json({ recommendations });
    } catch (error) {
      console.error("Error getting training recommendations:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  // Reminder Settings
  app.get(api.reminders.get.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const settings = await storage.getReminderSettings(userId);
    res.json(settings || null);
  });

  app.put(api.reminders.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.reminders.update.input.parse(req.body);
      const settings = await storage.upsertReminderSettings(userId, input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Send SMS reminder manually (test endpoint)
  app.post("/api/reminders/send-sms", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { phoneNumber, affirmation } = req.body;

      if (!phoneNumber || !affirmation) {
        return res.status(400).json({ message: "Phone number and affirmation are required" });
      }

      const result = await sendAffirmationReminder(phoneNumber, affirmation);
      
      if (result.success) {
        res.json({ message: "SMS sent successfully" });
      } else {
        res.status(500).json({ message: result.error || "Failed to send SMS" });
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: "Failed to send SMS reminder" });
    }
  });

  // Chat Conversations
  app.get(api.chat.listConversations.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const conversations = await storage.getChatConversations(userId);
    res.json(conversations);
  });

  app.get(api.chat.getConversation.path, isAuthenticated, async (req, res) => {
    const conversation = await storage.getChatConversation(Number(req.params.id));
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  });

  app.post(api.chat.createConversation.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.chat.createConversation.input.parse(req.body);
      const conversation = await storage.createChatConversation({ ...input, userId });
      res.status(201).json(conversation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.chat.addMessage.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.chat.addMessage.input.parse(req.body);
      const message = await storage.addChatMessage({ ...input, conversationId: Number(req.params.id) });
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.chat.getMessagesPaginated.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const conversationId = Number(req.params.id);
    
    const limitParam = Number(req.query.limit);
    const offsetParam = Number(req.query.offset);
    const limit = Math.max(1, Math.min(isNaN(limitParam) ? 50 : limitParam, 100));
    const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam);
    
    const conversation = await storage.getChatConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    if (conversation.userId !== userId) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const result = await storage.getChatMessagesPaginated(conversationId, limit, offset);
    res.json(result);
  });

  app.delete(api.chat.deleteConversation.path, isAuthenticated, async (req, res) => {
    await storage.deleteChatConversation(Number(req.params.id));
    res.status(204).send();
  });

  // User Streaks
  app.get(api.streaks.get.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const streaks = await storage.getUserStreaks(userId);
    res.json(streaks || null);
  });

  app.post(api.streaks.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const type = req.params.type as 'affirmation' | 'journal' | 'meditation';
      if (!['affirmation', 'journal', 'meditation'].includes(type)) {
        return res.status(400).json({ message: "Invalid streak type" });
      }
      const streaks = await storage.updateStreak(userId, type);
      res.json(streaks);
    } catch (error) {
      console.error("Error updating streak:", error);
      res.status(500).json({ message: "Failed to update streak" });
    }
  });

  // Daily Rituals
  app.get(api.rituals.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const rituals = await storage.getDailyRituals(userId);
    res.json(rituals);
  });

  app.post(api.rituals.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.rituals.create.input.parse(req.body);
      const ritual = await storage.createDailyRitual({ ...input, userId });
      res.status(201).json(ritual);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.rituals.complete.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.rituals.complete.input.parse(req.body);
      const completion = await storage.completeRitual(userId, Number(req.params.id), input.notes);
      res.status(201).json(completion);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.rituals.getCompletions.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const completions = await storage.getRitualCompletions(userId, Number(req.params.id));
    res.json(completions);
  });

  return httpServer;
}
