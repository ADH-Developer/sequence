import SequenceError, { MODEL_NOT_FOUND } from "src/error/sequenceError";
import Email, { EmailCreationAttributes } from "src/models/email.model";
import SendEmail from "src/services/email/sendEmail";
import { GraphQLContextType } from "..";

type CreateEmailInputArgs = Partial<EmailCreationAttributes>;
type UpdateEmailInputArgs = Partial<EmailCreationAttributes> & {
  id: string;
};

export const createEmail = async (
  _: any,
  { name, bodyHtml, subject, from, fromName, localTo }: CreateEmailInputArgs,
  { models, user }: GraphQLContextType
) => {
  return await models.Email.create({
    userId: user.id,
    name,
    fromName,
    bodyHtml: bodyHtml || "",
    subject,
    from,
    localTo,
  });
};

export const updateEmail = async (
  _: any,
  args: UpdateEmailInputArgs,
  { models, user }: GraphQLContextType
) => {
  const id = args.id;
  let email: Email;

  email = await models.Email.findOne({
    where: {
      userId: user.id,
      id,
    },
  });

  if (!email) {
    throw new SequenceError("No email found", MODEL_NOT_FOUND);
  }

  args.bodyHtml = args.bodyHtml || "";
  const updateArgs: any = { ...args };
  delete updateArgs.id;
  delete updateArgs.createdAt;
  delete updateArgs.updatedAt;

  return await email.update(updateArgs);
};

export const deleteEmail = async (
  _: any,
  args: UpdateEmailInputArgs,
  { models, user }: GraphQLContextType
) => {
  const id = args.id;
  let email: Email;

  email = await models.Email.findOne({
    where: {
      userId: user.id,
      id,
    },
  });

  if (!email) {
    throw new SequenceError("No email found", MODEL_NOT_FOUND);
  }

  await email.destroy();
};

interface SendTestEmailArgs {
  emailId: string;
  to: string;
  currentSubject?: string;
  currentBodyHtml?: string;
}

export const sendTestEmail = async (
  _: any,
  args: SendTestEmailArgs,
  { models, user, app }: GraphQLContextType
) => {
  const id = args.emailId;
  let email: Email;

  email = await models.Email.findOne({
    where: {
      userId: user.id,
      id,
    },
  });

  if (!email) {
    throw new SequenceError("No email found", MODEL_NOT_FOUND);
  }

  // Look up user by email
  const productUser = await models.ProductUser.findOne({
    where: {
      email: args.to,
    },
  });

  // Create mock user data if no user found
  const mockUser = {
    email: args.to,
    firstName: "Test",
    lastName: "User",
    domain: "example.com",
    traits: {
      desktop_score: "desktop_score",
      mobile_score: "mobile_score",
      batch_id: "batch_id",
      has_response: "has_response"
    }
  };

  const sendEmail = new SendEmail();

  // Update the email instance with new subject and body if provided
  if (args.currentSubject) {
    email.subject = args.currentSubject;
  }
  if (args.currentBodyHtml) {
    email.bodyHtml = args.currentBodyHtml;
  }

  sendEmail
    .setProvider(app.getEmail().getProvider())
    .setEmail(email)
    .setToAddress(args.to)
    .setProductUser(productUser || mockUser);

  await sendEmail.send();

  return { success: true };
};
