import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button, ButtonVariant, SelectOption, Text, TextContent } from '@patternfly/react-core';
import { ProvisionSource } from '../../../../constants/vm/provision-source';
import { FormFieldRow } from '../../form/form-field-row';
import { FormField, FormFieldType } from '../../form/form-field';
import { iGetFieldValue } from '../../selectors/immutable/field';
import { VMSettingsField } from '../../types';
import { iGet, iGetIn } from '../../../../utils/immutable';
import { FormPFSelect } from '../../../form/form-pf-select';
import { ValidationErrorType } from '@console/shared';

const ProvisionSourceDiskHelpMsg: React.FC<ProvisionSourceDiskHelpMsgProps> = ({
  provisionSourceValue,
  goToStorageStep,
}) => {
  const { t } = useTranslation();
  const getStorageMsg = () => {
    switch (ProvisionSource.fromString(provisionSourceValue)) {
      case ProvisionSource.URL:
        return (
          <TextContent>
            <div className="pf-c-form__helper-text" aria-live="polite">
              <Trans ns="kubevirt-plugin" t={t}>
                Enter URL here or edit the rootdisk in the{' '}
                <strong>
                  <Button
                    isDisabled={!goToStorageStep}
                    isInline
                    onClick={goToStorageStep}
                    variant={ButtonVariant.link}
                  >
                    Storage
                  </Button>
                </strong>{' '}
                step.
              </Trans>
            </div>
            <div className="pf-c-form__helper-text" aria-live="polite">
              {t(
                'kubevirt-plugin~To boot this source from a CD-ROM edit the disk in the storage step and change to type: CD-ROM',
              )}
            </div>
          </TextContent>
        );
      case ProvisionSource.CONTAINER:
      case ProvisionSource.CONTAINER_EPHEMERAL:
        return (
          <Text>
            <Trans ns="kubevirt-plugin" t={t}>
              Enter container image here or edit the rootdisk in the{' '}
              <strong>
                <Button
                  isDisabled={!goToStorageStep}
                  isInline
                  onClick={goToStorageStep}
                  variant={ButtonVariant.link}
                >
                  Storage
                </Button>
              </strong>{' '}
              step.
            </Trans>
          </Text>
        );
      case ProvisionSource.DISK:
        return (
          <Trans ns="kubevirt-plugin" t={t}>
            Choose PVC to clone by editing the rootdisk in the{' '}
            <strong>
              <Button
                isDisabled={!goToStorageStep}
                isInline
                onClick={goToStorageStep}
                variant={ButtonVariant.link}
              >
                Storage
              </Button>
            </strong>{' '}
            step.
          </Trans>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pf-c-form__helper-text" aria-live="polite">
      {getStorageMsg()}
    </div>
  );
};

const ProvisionSourceNetHelpMsg: React.FC<ProvisionSourceNetHelpMsgProps> = ({
  goToNetworkingStep,
}) => {
  const { t } = useTranslation();
  return (
    <div className="pf-c-form__helper-text" aria-live="polite">
      <Trans ns="kubevirt-plugin" t={t}>
        Add a network interface in the{' '}
        <strong>
          <Button
            isDisabled={!goToNetworkingStep}
            isInline
            onClick={goToNetworkingStep}
            variant={ButtonVariant.link}
          >
            Networking
          </Button>
        </strong>{' '}
        step
      </Trans>
    </div>
  );
};

export const ProvisionSourceComponent: React.FC<ProvisionSourceComponentProps> = React.memo(
  ({ provisionSourceField, onChange, goToStorageStep, goToNetworkingStep }) => {
    const provisionSourceValue = iGetFieldValue(provisionSourceField);
    const sources = iGet(provisionSourceField, 'sources');
    const validationType = iGetIn(provisionSourceField, ['validation', 'type']);

    return (
      <FormFieldRow field={provisionSourceField} fieldType={FormFieldType.PF_SELECT}>
        <FormField value={provisionSourceValue}>
          <FormPFSelect
            onSelect={(e, v) => {
              onChange(VMSettingsField.PROVISION_SOURCE_TYPE, v.toString());
            }}
          >
            {(sources || [])
              .map(ProvisionSource.fromString)
              .sort((a, b) => a.getOrder() - b.getOrder())
              .map((source) => (
                <SelectOption
                  key={source.getValue()}
                  value={source.getValue()}
                  description={source.getDescription()}
                >
                  {source.toString()}
                </SelectOption>
              ))}
          </FormPFSelect>
        </FormField>
        {[
          ProvisionSource.URL.getValue(),
          ProvisionSource.CONTAINER.getValue(),
          ProvisionSource.CONTAINER_EPHEMERAL.getValue(),
          ProvisionSource.DISK.getValue(),
        ].includes(provisionSourceValue) && (
          <ProvisionSourceDiskHelpMsg
            provisionSourceValue={provisionSourceValue}
            goToStorageStep={goToStorageStep}
          />
        )}
        {[ProvisionSource.PXE.getValue()].includes(provisionSourceValue) &&
          validationType !== ValidationErrorType.Error && (
            <ProvisionSourceNetHelpMsg goToNetworkingStep={goToNetworkingStep} />
          )}
      </FormFieldRow>
    );
  },
);

type ProvisionSourceDiskHelpMsgProps = {
  provisionSourceValue: string;
  goToStorageStep: () => void;
};

type ProvisionSourceNetHelpMsgProps = {
  goToNetworkingStep: () => void;
};

type ProvisionSourceComponentProps = {
  provisionSourceField: any;
  onChange: (key: string, value: string | boolean) => void;
  goToStorageStep: () => void;
  goToNetworkingStep: () => void;
};