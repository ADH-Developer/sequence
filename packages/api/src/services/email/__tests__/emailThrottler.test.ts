import { expect } from 'chai';
import sinon from 'sinon';
import EmailThrottler from "../emailThrottler";
import Redis from "ioredis";
import Bottleneck from "bottleneck";

describe("EmailThrottler", () => {
    let throttler: EmailThrottler;
    let mockLimiter: sinon.SinonMock;
    let redisStub: sinon.SinonStub;

    beforeEach(() => {
        // Setup Redis stub
        const mockRedisClient = {
            connect: sinon.stub().resolves(),
            quit: sinon.stub().resolves(),
            on: sinon.stub().returnsThis(),
        };
        redisStub = sinon.stub(Redis.prototype, 'constructor').returns(mockRedisClient);

        // Setup Bottleneck mock
        mockLimiter = sinon.mock(Bottleneck.prototype);
        mockLimiter.expects('schedule').resolves();
        mockLimiter.expects('disconnect').resolves();
        mockLimiter.expects('on').returnsThis();

        // Create throttler instance with test configuration
        throttler = new EmailThrottler({
            maxConcurrent: 2,
            minTime: 100,
            reservoir: 10,
            reservoirRefreshAmount: 10,
            reservoirRefreshInterval: 1000,
        });
    });

    afterEach(async () => {
        await throttler.stop();
        redisStub.restore();
        sinon.restore();
    });

    it("should initialize with default config", () => {
        const defaultThrottler = new EmailThrottler();
        expect(defaultThrottler).to.exist;
    });

    it("should schedule tasks through the limiter", async () => {
        const task = async () => "test";
        await throttler.schedule(task);
        expect(mockLimiter.expects('schedule').calledOnce).to.be.true;
    });

    it("should handle errors from scheduled tasks", async () => {
        const error = new Error("Test error");
        const task = async () => { throw error; };
        mockLimiter.expects('schedule').rejects(error);

        try {
            await throttler.schedule(task);
            expect.fail("Should have thrown an error");
        } catch (e) {
            expect(e).to.equal(error);
        }
    });

    it("should track metrics for successful tasks", async () => {
        const task = async () => "test";
        await throttler.schedule(task);
        const metrics = throttler.getMetrics();
        expect(metrics.totalEmails).to.equal(1);
        expect(metrics.throttledEmails).to.equal(0);
        expect(metrics.errors).to.equal(0);
    });

    it("should track metrics for failed tasks", async () => {
        const error = new Error("Test error");
        const task = async () => { throw error; };
        mockLimiter.expects('schedule').rejects(error);

        try {
            await throttler.schedule(task);
            expect.fail("Should have thrown an error");
        } catch (e) {
            const metrics = throttler.getMetrics();
            expect(metrics.errors).to.equal(1);
        }
    });

    it("should handle throttler events", async () => {
        const error = new Error("Test error");
        const task = async () => { throw error; };
        mockLimiter.expects('schedule').rejects(error);

        try {
            await throttler.schedule(task);
            expect.fail("Should have thrown an error");
        } catch (e) {
            const metrics = throttler.getMetrics();
            expect(metrics.errors).to.equal(1);
        }
    });

    it("should clean up resources when stopped", async () => {
        await throttler.stop();
        expect(mockLimiter.expects('disconnect').calledOnce).to.be.true;
    });
}); 