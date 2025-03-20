import React, { useContext, useEffect, useState } from "react";
import { Createable } from "components/common/Select";
import { AttributeFilter } from "common/filters";
import OperatorsSelect from "../OperatorsSelect";
import { RenderNodeProps } from "../RenderNode";
import { AudienceBuilderContext } from "components/AudienceBuilder";
import { ActionMeta } from "react-select";

interface Props extends RenderNodeProps {
  node: AttributeFilter;
}

interface SelectOption {
  label: string;
  value: string;
}

const RenderUserAttributeFilterInner = ({ node }: Props) => {
  const audienceBuilderContext = useContext(AudienceBuilderContext);
  const editable = audienceBuilderContext.editable;
  const [currentValue, setCurrentValue] = useState<SelectOption | null>(null);

  useEffect(() => {
    if (typeof node.attribute !== "undefined") {
      const filterOptions = node.getFilterOptions();
      const foundOption = filterOptions.find((f) => f.value === node.attribute);
      if (foundOption) {
        setCurrentValue(foundOption);
      } else if (node.attribute) {
        // Handle custom attributes that aren't in predefined options
        setCurrentValue({
          label: node.attribute,
          value: node.attribute
        });
      }
    }
  }, []);

  return (
    <React.Fragment>
      <Createable
        value={currentValue}
        options={node.getFilterOptions()}
        onChange={(newValue: SelectOption | null, actionMeta: ActionMeta<SelectOption>) => {
          if (newValue) {
            node.setAttribute(newValue.value);
            setCurrentValue(newValue);
            audienceBuilderContext.onChange();
          }
        }}
        isDisabled={!editable}
        isClearable
        isSearchable
        formatCreateLabel={(inputValue: string) => `Use custom attribute "${inputValue}"`}
        placeholder="Select or type a custom attribute..."
        containerWidth={300}
      />
      <OperatorsSelect editable={editable} node={node} />
    </React.Fragment>
  );
};

export default RenderUserAttributeFilterInner;
