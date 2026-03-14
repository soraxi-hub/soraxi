import mongoose, { Model } from "mongoose";
import { getRequestModel } from "@/lib/db/models/request.model";
import type { IRequest, IRequestDocument } from "@/lib/db/models/request.model";
// import { LeanDocumentWithId } from "./coupon.service";

/**
 * RequestService
 *
 * Handles all business logic for the SORAXI demand marketplace.
 * Users can create posts describing items they are looking for.
 *
 * This service separates business logic from tRPC routers,
 * keeping API handlers thin and maintainable.
 */
export class RequestService {
  private Request!: Model<IRequestDocument>;

  /**
   * Private constructor.
   * Forces usage of `RequestService.init()` to safely load models.
   */
  private constructor() {}

  /**
   * Initializes the service and loads database models.
   */
  static async init(): Promise<RequestService> {
    const service = new RequestService();
    service.Request = await getRequestModel();
    return service;
  }

  /**
   * Creates a new request post.
   */
  async createRequest(params: {
    userId: string;
    title: string;
    description?: string;
    category?: string[];
    budgetMin?: number;
    budgetMax?: number;
    images?: string[];
  }) {
    const request = await this.Request.create({
      ...params,
      userId: new mongoose.Types.ObjectId(params.userId),
    });

    return request.toObject();
  }

  /**
   * Fetches all active marketplace requests.
   * Used for the public marketplace feed.
   */
  async getAllRequests(params?: {
    page?: number;
    limit?: number;
    category?: string[];
  }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      status: "open",
    };

    if (params?.category && params.category.length > 0) {
      filter.category = { $in: params.category };
    }

    const [requests, total] = await Promise.all([
      this.Request.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IRequest[]>(),

      this.Request.countDocuments(filter),
    ]);

    return {
      requests: requests.map((r) => {
        return {
          ...r,
          _id: r._id.toString(),
          userId: r.userId.toString(),
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch a single request by ID.
   */
  async getRequestById(requestId: string): Promise<IRequest | null> {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("Invalid request ID");
    }

    const request = await this.Request.findById(
      requestId,
    ).lean<IRequest | null>();

    return request;
  }

  /**
   * Fetch all requests created by a specific user.
   */
  async getUserRequests(userId: string) {
    const requests = await this.Request.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean<IRequest[]>();

    const formattedRequests = requests.map((r) => {
      return {
        ...r,
        _id: r._id.toString(),
        userId: r.userId.toString(),
      };
    });

    return formattedRequests;
  }

  /**
   * Updates a request post.
   * Ensures only the owner can modify it.
   */
  async updateRequest(params: {
    requestId: string;
    userId: string;
    title?: string;
    description?: string;
    category?: string[];
    budgetMin?: number;
    budgetMax?: number;
    images?: string[];
  }) {
    const { requestId, userId, ...updates } = params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("Invalid request ID");
    }

    const request = await this.Request.findOneAndUpdate(
      {
        _id: requestId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      updates,
      { new: true },
    ).lean<IRequest | null>();

    if (!request) {
      throw new Error("Request not found or unauthorized");
    }

    return request;
  }

  /**
   * Deletes a request post.
   * Only the owner can delete their request.
   */
  async deleteRequest(params: { requestId: string; userId: string }) {
    const { requestId, userId } = params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("Invalid request ID");
    }

    const result = await this.Request.findOneAndDelete({
      _id: requestId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!result) {
      throw new Error("Request not found or unauthorized");
    }

    return true;
  }

  /**
   * Marks a request as fulfilled.
   * Used when the user finds the item they were looking for.
   */
  async markRequestFulfilled(params: { requestId: string; userId: string }) {
    const { requestId, userId } = params;

    const request = await this.Request.findOneAndUpdate(
      {
        _id: requestId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        status: "fulfilled",
      },
      { new: true },
    ).lean<IRequest | null>();

    if (!request) {
      throw new Error("Request not found or unauthorized");
    }

    return request;
  }
}
