import { SendEmail } from "../sendEmail";
import EmailThrottler from "../emailThrottler";
import AbstractEmailProvider from "../providers/abstractEmailProvider";
import Email from "src/models/email.model";
import ProductUser from "src/models/productUser.model";

jest.mock("../emailThrottler");

describe("SendEmail", () => {
    let mockProvider: jest.Mocked<AbstractEmailProvider>;
    let mockEmail: Email;
    let mockProductUser: ProductUser;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock provider
        mockProvider = {
            send: jest.fn().mockResolvedValue({ success: true }),
        } as unknown as jest.Mocked<AbstractEmailProvider>;

        // Setup mock email
        mockEmail = {
            bodyHtml: "<p>Hello {{name}}</p>",
            subject: "Test Email",
        } as Email;

        // Setup mock product user
        mockProductUser = {
            email: "test@example.com",
            name: "Test User",
            toJSON: jest.fn().mockReturnValue({
                email: "test@example.com",
                name: "Test User",
                traits: { company: "Test Company" },
            }),
        } as unknown as ProductUser;

        // Initialize throttler
        SendEmail.initializeThrottler({
            maxConcurrent: 2,
            minTime: 100,
        });
    });

    afterEach(async () => {
        await SendEmail.stop();
    });

    it("should initialize throttler with default config", () => {
        SendEmail.initializeThrottler();
        expect(EmailThrottler).toHaveBeenCalled();
    });

    it("should send email through throttler", async () => {
        const sendEmail = new SendEmail()
            .setProvider(mockProvider)
            .setEmail(mockEmail)
            .setProductUser(mockProductUser);

        await sendEmail.send();

        expect(mockProvider.send).toHaveBeenCalledWith({
            html: "<p>Hello Test User</p>",
            subject: "Test Email",
            to: "test@example.com",
        });
    });

    it("should handle errors in email sending", async () => {
        const error = new Error("Send failed");
        mockProvider.send.mockRejectedValue(error);

        const sendEmail = new SendEmail()
            .setProvider(mockProvider)
            .setEmail(mockEmail)
            .setProductUser(mockProductUser);

        await expect(sendEmail.send()).rejects.toThrow("Send failed");
    });

    it("should use custom to address when provided", async () => {
        const customEmail = "custom@example.com";
        const sendEmail = new SendEmail()
            .setProvider(mockProvider)
            .setEmail(mockEmail)
            .setProductUser(mockProductUser)
            .setToAddress(customEmail);

        await sendEmail.send();

        expect(mockProvider.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: customEmail,
            })
        );
    });

    it("should throw error if throttler not initialized", async () => {
        await SendEmail.stop();
        const sendEmail = new SendEmail()
            .setProvider(mockProvider)
            .setEmail(mockEmail)
            .setProductUser(mockProductUser);

        await expect(sendEmail.send()).rejects.toThrow(
            "Email throttler not initialized"
        );
    });
}); 