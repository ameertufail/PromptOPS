import { describe, expect, it } from "vitest";
import {
  getOrgBySlug,
  getProjectByOrgAndSlug,
  listOrgAuditEvents,
  listOrgMembers
} from "./queries";
import { MockDb } from "../test-utils/d1";

describe("Phase 11 db query helpers", () => {
  it("loads organizations by slug", async () => {
    const org = {
      created_at: "2026-03-09T08:00:00.000Z",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      name: "Acme",
      slug: "acme"
    };
    const db = new MockDb([], [org]);

    const result = await getOrgBySlug(db as unknown as D1Database, {
      slug: "acme"
    });

    expect(result).toEqual(org);
    expect(db.prepareCalls[0]?.boundValues).toEqual(["acme"]);
  });

  it("loads organization members with joined user data", async () => {
    const db = new MockDb([], [], {
      allResponses: [
        [
          {
            membership_created_at: "2026-03-09T08:05:00.000Z",
            org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
            role: "ADMIN",
            user_avatar_url: "https://avatars.example/alice.png",
            user_created_at: "2026-03-09T08:00:00.000Z",
            user_email: "alice@example.com",
            user_github_id: 42,
            user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
            user_name: "Alice"
          }
        ]
      ]
    });

    const result = await listOrgMembers(db as unknown as D1Database, {
      orgId: "01ARZ3NDEKTSV4RRFFQ69G5FAA"
    });

    expect(result).toEqual([
      {
        membership: {
          created_at: "2026-03-09T08:05:00.000Z",
          org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
          role: "ADMIN",
          user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV"
        },
        user: {
          avatar_url: "https://avatars.example/alice.png",
          created_at: "2026-03-09T08:00:00.000Z",
          email: "alice@example.com",
          github_id: 42,
          id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          name: "Alice"
        }
      }
    ]);
  });

  it("loads projects by organization and slug", async () => {
    const project = {
      created_at: "2026-03-09T08:10:00.000Z",
      description: "Core app",
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
      name: "PromptOps",
      org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      slug: "promptops"
    };
    const db = new MockDb([], [project]);

    const result = await getProjectByOrgAndSlug(db as unknown as D1Database, {
      orgId: project.org_id,
      slug: project.slug
    });

    expect(result).toEqual(project);
    expect(db.prepareCalls[0]?.boundValues).toEqual([
      project.org_id,
      project.slug
    ]);
  });

  it("parses paginated audit events and metadata objects", async () => {
    const db = new MockDb([], [{ total: 1 }], {
      allResponses: [
        [
          {
            action: "project.created",
            actor_user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
            created_at: "2026-03-09T08:15:00.000Z",
            entity_id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
            entity_type: "project",
            id: "01ARZ3NDEKTSV4RRFFQ69G5FAC",
            metadata: JSON.stringify({ slug: "promptops" }),
            org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA"
          }
        ]
      ]
    });

    const result = await listOrgAuditEvents(db as unknown as D1Database, {
      limit: 10,
      orgId: "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      page: 1
    });

    expect(result).toEqual({
      events: [
        {
          action: "project.created",
          actor_user_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          created_at: "2026-03-09T08:15:00.000Z",
          entity_id: "01ARZ3NDEKTSV4RRFFQ69G5FAB",
          entity_type: "project",
          id: "01ARZ3NDEKTSV4RRFFQ69G5FAC",
          metadata: {
            slug: "promptops"
          },
          org_id: "01ARZ3NDEKTSV4RRFFQ69G5FAA"
        }
      ],
      total: 1
    });
    expect(db.prepareCalls[0]?.boundValues).toEqual([
      "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      10,
      0
    ]);
  });
});
