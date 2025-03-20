import Sun from "public/sun_icon.svg";
import BlueClock from "public/blue_clock.svg";
import SpecificTime from "public/specific_time.svg";
import {
  CampaignAudienceRules,
  CampaignEmailScheduling,
} from "common/campaign";
import { defaultProp } from "services/defaultProp";
import styles from "./campaign.module.css";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { TextField } from "@material-ui/core";

interface InnerProps {
  onClick: () => void;
  image: string;
  title: string;
  subtitle: string;
  value: CampaignEmailScheduling;
  selected: CampaignEmailScheduling;
}

const EmailScheduling = (props: InnerProps) => {
  return (
    <div
      className={classNames(
        "container",
        props.selected === props.value ? "selected" : ""
      )}
      onClick={props.onClick}
    >
      <img src={props.image} />
      <div className="text">
        <h3>{props.title}</h3>
        <p>{props.subtitle}</p>
      </div>
      <style jsx>
        {`
          .container {
            display: flex;
            flex-direction: row;
            flex-grow: 1;
            padding: 0.75em;
            flex-basis: 0;
            align-items: flex-start;
            border: 1px solid #c8c8c8;
            border-radius: 4px;
            position: relative;
            -webkit-transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
            transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
          }
          .container:hover {
            box-shadow: 0px 0px 0px 1px rgba(15, 15, 15, 0.05),
              0px 3px 6px rgba(15, 15, 15, 0.1),
              0px 9px 24px rgba(15, 15, 15, 0.2);
            cursor: pointer;
          }
          .text {
            display: flex;
            flex-direction: column;
            margin-left: 0.75em;
          }
          .selected {
            box-shadow: var(--subtle-shadow);
          }
          .selected::before {
            content: "";
            position: absolute;
            z-index: 4;
            width: 50px;
            top: -17px;
            right: -19px;
            height: 50px;
            background-image: url("/green_check.svg");
            background-size: 50px 50px;
            background-position: 0px 0px, right 0px bottom 0px;
            background-repeat: no-repeat;
          }
          h3 {
            margin-block-start: 0px;
            margin-block-end: 0px;
            font-weight: 600;
            font-size: 16px;
            line-height: 21px;
            color: var(--body-text);
          }
          p {
            margin-block-start: 0.25em;
            margin-block-end: 0px;
            font-weight: normal;
            font-size: 16px;
            line-height: 21px;
            color: var(--body-text);
          }
        `}
      </style>
    </div>
  );
};

interface Props {
  selected?: CampaignEmailScheduling;
  onClick?: (rule: CampaignEmailScheduling) => void;
  onTimeChange?: (hour: number, minute: number) => void;
  specificTime?: { hour: number; minute: number };
}

const RenderCampaignEmailScheduling = (props: Props) => {
  const propsClick = defaultProp(props.onClick, () => { });
  const selected = props.selected;
  const onClick = (rule: CampaignEmailScheduling) => () => propsClick(rule);
  const [time, setTime] = useState(
    props.specificTime ?
      `${props.specificTime.hour.toString().padStart(2, '0')}:${props.specificTime.minute.toString().padStart(2, '0')}` :
      "11:30"
  );

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTime(event.target.value);
    if (props.onTimeChange) {
      const [hours, minutes] = event.target.value.split(':').map(Number);
      props.onTimeChange(hours, minutes);
    }
  };

  return (
    <div>
      <div className={styles.audience_rules}>
        <EmailScheduling
          image={BlueClock}
          onClick={onClick(CampaignEmailScheduling.Immediately)}
          value={CampaignEmailScheduling.Immediately}
          selected={selected}
          title="IMMEDIATELY"
          subtitle="Send the message immediately, be it afternoon or midnight."
        />
        <EmailScheduling
          image={Sun}
          onClick={onClick(CampaignEmailScheduling.BusinessHours)}
          value={CampaignEmailScheduling.BusinessHours}
          selected={selected}
          title="BUSINESS HOURS"
          subtitle="Send if during business hours, otherwise schedule it for the next business day."
        />
        <EmailScheduling
          image={SpecificTime}
          onClick={onClick(CampaignEmailScheduling.SpecificTime)}
          value={CampaignEmailScheduling.SpecificTime}
          selected={selected}
          title="SPECIFIC TIME"
          subtitle="Send at this specific time, scheduling for tomorrow if it's passed."
        />
      </div>
      {selected === CampaignEmailScheduling.SpecificTime && (
        <div style={{ marginTop: '1em' }}>
          <TextField
            label="Select Time"
            type="time"
            value={time}
            onChange={handleTimeChange}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              step: 300, // 5 min
            }}
            style={{ width: '200px' }}
          />
        </div>
      )}
    </div>
  );
};

export default RenderCampaignEmailScheduling;
