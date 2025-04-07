import { useState } from "react";
import { useMutation } from "@apollo/client";
import { CircularProgress } from "@material-ui/core";
import { SEND_TEST_EMAIL } from "./EmailQueries";
import { SendTestEmail, SendTestEmailVariables } from "__generated__/SendTestEmail";
import CreateInput from "components/common/CreateInput";

interface Props {
  emailId: string;
  currentSubject: string;
  currentBodyHtml: string;
}

const TestEmailButton = (props: Props) => {
  const [email, setEmail] = useState("");
  const [sendTestEmail, { loading }] = useMutation<SendTestEmail, SendTestEmailVariables>(
    SEND_TEST_EMAIL
  );

  const onSendTestEmail = async () => {
    await sendTestEmail({
      variables: {
        emailId: props.emailId,
        to: email,
        currentSubject: props.currentSubject,
        currentBodyHtml: props.currentBodyHtml
      },
    });
  };

  return (
    <div className="test-email-wrapper">
      <CreateInput
        value={email}
        placeholder="Enter email to test"
        onChangeText={setEmail}
        style={{ marginRight: 8, width: 200 }}
      />
      <button
        className="test-email-button"
        onClick={onSendTestEmail}
        disabled={loading || !email}
      >
        {loading ? <CircularProgress size={20} /> : "Send Test Email"}
      </button>
      <style jsx>{`
        .test-email-wrapper {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .test-email-button {
          background: #4a7da7;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .test-email-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default TestEmailButton;
