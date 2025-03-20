import { Edge } from "./nodes";
import AbstractCampaignNode from "./nodes/abstractCampaignNode";
import AudienceCampaignNode from "./nodes/audienceCampaignNode";
import TriggerCampaignNode from "./nodes/triggerCampaignNode";
import { Model, ModelStatic } from "sequelize";

type CampaignNodeID = string;
type CampaignNodeEdgeId = string;

export enum CampaignNodeKind {
  Trigger = "Trigger",
  Audience = "Audience",
  Filter = "Filter",
  Wait = "Wait",
  Email = "Email",
}

export type EntryNodeKinds = TriggerCampaignNode | AudienceCampaignNode;

export enum CampaignAudienceRules {
  Existing = "Existing",
  New = "New",
  Both = "Both",
}

export enum CampaignEmailScheduling {
  Immediately = "Immediately",
  BusinessHours = "BusinessHours",
  SpecificTime = "SpecificTime",
}

export enum EdgeKind {
  Default = "Default",
  Timeout = "Timeout",
}

export enum WaitType {
  Relative = "Relative",
  Specific = "Specific",
}

export type WaitValueType = WaitValueRelativeDuration | WaitValueSpecificTime;

export interface WaitValueRelativeDuration {
  kind: WaitType.Relative;
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface WaitValueSpecificTime {
  kind: WaitType.Specific;
  hour: number;
  minute: number;
}

export type CustomEdge = {
  edgeKind: EdgeKind;
  node: AbstractCampaignNode;
};

export type CampaignGraphEdges = Record<CampaignNodeEdgeId, Edge>;

export interface EmailCampaignNodeJson {
  emailId: string;
  originalTemplateId?: string;
  scheduling: CampaignEmailScheduling;
  specificTime?: {
    hour: number;
    minute: number;
  };
  distributionConfig?: {
    peakTime: {
      hour: number;
      minute: number;
    };
    aggressiveness: number;
  };
}

export interface CampaignNodeStateAttributes {
  id: string;
  campaignNodeId: string;
  productUserId: string;
  state: string;
  runAt: Date;
  userId: string;
  campaignId: string;
  createdAt: Date;
  updatedAt: Date;
}
