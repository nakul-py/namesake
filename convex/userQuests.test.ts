import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("userQuests", () => {
  describe("getAll", () => {
    it("should return all user quests", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await t.run(async (ctx) => {
        // Create quests
        const quest1Id = await ctx.db.insert("quests", {
          title: "Test Quest 1",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        const quest2Id = await ctx.db.insert("quests", {
          title: "Test Quest 2",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        // Create user quests
        await ctx.db.insert("userQuests", {
          userId,
          questId: quest1Id,
          status: "active",
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId: quest2Id,
          status: "completed",
        });
      });

      const quests = await asUser.query(api.userQuests.getAll, {});
      expect(quests).toHaveLength(2);
      expect(quests.map((q) => q.title)).toContain("Test Quest 1");
      expect(quests.map((q) => q.title)).toContain("Test Quest 2");
    });

    it("should not return deleted quests", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await t.run(async (ctx) => {
        const questId = await ctx.db.insert("quests", {
          title: "Deleted Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
          deletionTime: Date.now(),
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId,
          status: "active",
        });
      });

      const quests = await asUser.query(api.userQuests.getAll, {});
      expect(quests).toHaveLength(0);
    });
  });

  describe("count", () => {
    it("should return count of user quests", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await t.run(async (ctx) => {
        const questId = await ctx.db.insert("quests", {
          title: "Test Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId,
          status: "active",
        });
      });

      const count = await asUser.query(api.userQuests.count, {});
      expect(count).toBe(1);
    });
  });

  describe("create", () => {
    it("should create a user quest", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await asUser.run(async (ctx) => {
        return await ctx.db.insert("quests", {
          title: "Test Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      await t.run(async (ctx) => {
        const userQuest = await ctx.db
          .query("userQuests")
          .withIndex("userId", (q) => q.eq("userId", userId))
          .first();
        expect(userQuest?.questId).toBe(questId);
      });
    });

    it("should set a default status", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await asUser.run(async (ctx) => {
        return await ctx.db.insert("quests", {
          title: "Test Quest",
          category: "core",
          jurisdiction: "MA",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      const status = await asUser.query(api.userQuests.getStatus, { questId });
      expect(status).toBe("notStarted");
    });

    it("should throw if quest already exists", async () => {
      // ADD
    });
  });

  describe("setStatus", async () => {
    it("should update quest status", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await t.run(async (ctx) => {
        return ctx.db.insert("quests", {
          title: "Test Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      await asUser.mutation(api.userQuests.setStatus, {
        questId,
        status: "complete",
      });

      const status = await asUser.query(api.userQuests.getStatus, { questId });
      expect(status).toBe("complete");
    });

    it("should throw error if status is invalid", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await t.run(async (ctx) => {
        return ctx.db.insert("quests", {
          title: "Test Quest",
          category: "core",
          jurisdiction: "MA",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      await expect(
        asUser.mutation(api.userQuests.setStatus, {
          questId,
          status: "invalid",
        }),
      ).rejects.toThrow("Invalid status");
    });

    it("should prevent setting 'filed' status on non-core quests", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const nonCoreQuestId = await t.run(async (ctx) => {
        return ctx.db.insert("quests", {
          title: "Test Quest",
          category: "housing",
          jurisdiction: "MA",
          creationUser: userId,
        });
      });

      const coreQuestId = await t.run(async (ctx) => {
        return ctx.db.insert("quests", {
          title: "Test Quest",
          category: "core",
          jurisdiction: "MA",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId: nonCoreQuestId });
      await asUser.mutation(api.userQuests.create, { questId: coreQuestId });

      await expect(
        asUser.mutation(api.userQuests.setStatus, {
          questId: nonCoreQuestId,
          status: "filed",
        }),
      ).rejects.toThrow("This status is reserved for core quests only.");

      await expect(
        asUser.mutation(api.userQuests.setStatus, {
          questId: coreQuestId,
          status: "filed",
        }),
      ).resolves.toBeNull();
    });

    it("should add completionTime when status changed to complete", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await t.run(async (ctx) => {
        return ctx.db.insert("quests", {
          title: "Test Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      const userQuest = await asUser.query(api.userQuests.getByQuestId, {
        questId,
      });

      expect(userQuest?.status).toBe("notStarted");
      expect(userQuest?.completionTime).toBeUndefined();

      await asUser.mutation(api.userQuests.setStatus, {
        questId,
        status: "complete",
      });

      const updatedUserQuest = await asUser.query(api.userQuests.getByQuestId, {
        questId,
      });

      expect(updatedUserQuest?.status).toBe("complete");
      expect(updatedUserQuest?.completionTime).toBeTypeOf("number"); // Unix timestamp
    });

    it("should remove completionTime when status changed away from complete", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await t.run(async (ctx) => {
        return ctx.db.insert("quests", {
          title: "Test Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      await asUser.mutation(api.userQuests.setStatus, {
        questId,
        status: "complete",
      });

      const updatedUserQuest = await asUser.query(api.userQuests.getByQuestId, {
        questId,
      });

      expect(updatedUserQuest?.status).toBe("complete");
      expect(updatedUserQuest?.completionTime).toBeTypeOf("number");

      await asUser.mutation(api.userQuests.setStatus, {
        questId,
        status: "notStarted",
      });

      const updatedQuest = await asUser.query(api.userQuests.getByQuestId, {
        questId,
      });

      expect(updatedQuest?.status).toBe("notStarted");
      expect(updatedQuest?.completionTime).toBeUndefined();
    });
  });

  describe("deleteForever", () => {
    it("should delete a user quest", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const questId = await t.run(async (ctx) => {
        return await ctx.db.insert("quests", {
          title: "Test Quest",
          category: "Test Category",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });
      });

      await asUser.mutation(api.userQuests.create, { questId });

      expect(
        await asUser.query(api.userQuests.getByQuestId, { questId }),
      ).not.toBeNull();

      await asUser.mutation(api.userQuests.deleteForever, { questId });

      expect(
        await asUser.query(api.userQuests.getByQuestId, { questId }),
      ).toBeNull();
    });
  });

  describe("getByCategory", () => {
    it("should return quests grouped by category", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await t.run(async (ctx) => {
        const quest1Id = await ctx.db.insert("quests", {
          title: "Test Quest 1",
          category: "core",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        const quest2Id = await ctx.db.insert("quests", {
          title: "Test Quest 2",
          category: "housing",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId: quest1Id,
          status: "active",
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId: quest2Id,
          status: "active",
        });
      });

      const questsByCategory = await asUser.query(
        api.userQuests.getByCategory,
        {},
      );
      expect(Object.keys(questsByCategory)).toContain("core");
      expect(Object.keys(questsByCategory)).toContain("housing");
      expect(questsByCategory.core).toHaveLength(1);
      expect(questsByCategory.housing).toHaveLength(1);
    });
  });

  describe("getByStatus", () => {
    it("should return quests grouped by status", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          role: "user",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await t.run(async (ctx) => {
        const quest1Id = await ctx.db.insert("quests", {
          title: "Active Quest",
          category: "core",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        const quest2Id = await ctx.db.insert("quests", {
          title: "Completed Quest",
          category: "housing",
          jurisdiction: "Test Jurisdiction",
          creationUser: userId,
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId: quest1Id,
          status: "inProgress",
        });

        await ctx.db.insert("userQuests", {
          userId,
          questId: quest2Id,
          status: "complete",
        });
      });

      const questsByStatus = await asUser.query(api.userQuests.getByStatus, {});
      expect(Object.keys(questsByStatus)).toContain("inProgress");
      expect(Object.keys(questsByStatus)).toContain("complete");
      expect(questsByStatus.inProgress).toHaveLength(1);
      expect(questsByStatus.complete).toHaveLength(1);
    });
  });
});