import { ValidationErrorType } from '@console/shared/src';
import {
  hasVmSettingsChanged,
  iGetProvisionSource,
} from '../../../selectors/immutable/vm-settings';
import { VMSettingsField, VMWizardStorage, VMWizardStorageType } from '../../../types';
import { InternalActionType, UpdateOptions } from '../../types';
import {
  hasStoragesChanged,
  iGetProvisionSourceStorage,
} from '../../../selectors/immutable/storage';
import { getProvisionSourceStorage } from '../../initial-state/storage-tab-initial-state';
import { VolumeWrapper } from '../../../../../k8s/wrapper/vm/volume-wrapper';
import { DataVolumeWrapper } from '../../../../../k8s/wrapper/vm/data-volume-wrapper';
import { StorageUISource } from '../../../../modals/disk-modal/storage-ui-source';
import { getNextIDResolver } from '../../../../../utils/utils';
import { getStorages } from '../../../selectors/selectors';
import { vmWizardInternalActions } from '../../internal-actions';
import { getTemplateValidation } from '../../../selectors/template';
import { TemplateValidations } from '../../../../../utils/validations/template/template-validations';
import { MutableDiskWrapper } from '../../../../../k8s/wrapper/vm/disk-wrapper';

export const prefillInitialDiskUpdater = ({ id, prevState, dispatch, getState }: UpdateOptions) => {
  const state = getState();
  if (!hasVmSettingsChanged(prevState, state, id, VMSettingsField.PROVISION_SOURCE_TYPE)) {
    return;
  }

  const iOldSourceStorage = iGetProvisionSourceStorage(state, id);
  const oldSourceStorage: VMWizardStorage = iOldSourceStorage && iOldSourceStorage.toJSON();

  const newSourceStorage = getProvisionSourceStorage(iGetProvisionSource(state, id));
  const oldType =
    oldSourceStorage &&
    StorageUISource.fromTypes(
      VolumeWrapper.initialize(oldSourceStorage.volume).getType(),
      DataVolumeWrapper.initialize(oldSourceStorage.dataVolume).getType(),
    );

  const newType =
    newSourceStorage &&
    StorageUISource.fromTypes(
      VolumeWrapper.initialize(newSourceStorage.volume).getType(),
      DataVolumeWrapper.initialize(newSourceStorage.dataVolume).getType(),
    );

  if (newType !== oldType) {
    if (!newSourceStorage) {
      // not a template provision source
      if (oldSourceStorage && oldSourceStorage.type === VMWizardStorageType.PROVISION_SOURCE_DISK) {
        dispatch(
          vmWizardInternalActions[InternalActionType.RemoveStorage](id, oldSourceStorage.id),
        );
      }
    } else {
      dispatch(
        vmWizardInternalActions[InternalActionType.UpdateStorage](id, {
          id: oldSourceStorage ? oldSourceStorage.id : getNextIDResolver(getStorages(state, id))(),
          ...newSourceStorage,
        }),
      );
    }
  }
};

export const internalStorageDiskBusUpdater = ({
  id,
  prevState,
  dispatch,
  getState,
}: UpdateOptions) => {
  const state = getState();

  // we care only about the first TemplateValidation because storage shows up after the first step
  const oldValidations = getTemplateValidation(prevState, id);
  const newValidations = getTemplateValidation(state, id);

  if (
    TemplateValidations.areBusesEqual(oldValidations, newValidations) &&
    !hasStoragesChanged(prevState, state, id)
  ) {
    return;
  }

  let someBusChanged = false;

  const updatedStorages = getStorages(state, id).map(({ type, disk, ...storageBundle }) => {
    let finalDisk = disk;
    if (
      [
        VMWizardStorageType.PROVISION_SOURCE_DISK,
        VMWizardStorageType.V2V_VMWARE_IMPORT,
        VMWizardStorageType.V2V_VMWARE_IMPORT_TEMP,
        VMWizardStorageType.WINDOWS_GUEST_TOOLS,
      ].includes(type)
    ) {
      const diskWrapper = new MutableDiskWrapper(disk);
      const diskType = diskWrapper.getType();
      const diskBus = diskWrapper.getDiskBus();
      const resultValidation = newValidations.validateBus(diskType, diskBus);
      if (!resultValidation.isValid && resultValidation.type === ValidationErrorType.Error) {
        someBusChanged = true;
        finalDisk = new MutableDiskWrapper(disk, true)
          .appendTypeData({ bus: newValidations.getDefaultBus(diskType) })
          .asMutableResource();
      }
    }

    return {
      ...storageBundle,
      type,
      disk: finalDisk,
    };
  });

  if (someBusChanged) {
    dispatch(vmWizardInternalActions[InternalActionType.SetStorages](id, updatedStorages));
  }
};

export const updateStorageTabState = (options: UpdateOptions) =>
  [prefillInitialDiskUpdater, internalStorageDiskBusUpdater].forEach((updater) => {
    updater && updater(options);
  });
