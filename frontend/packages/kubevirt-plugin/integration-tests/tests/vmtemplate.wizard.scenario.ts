/* eslint-disable max-nested-callbacks */
import { isEqual } from 'lodash';
import { testName } from '@console/internal-integration-tests/protractor.conf';
import { resourceTitle } from '@console/internal-integration-tests/views/crud.view';
import * as detailView from '../views/virtualMachine.view';
import {
  removeLeakedResources,
  withResource,
  createResources,
  deleteResources,
  deleteResource,
} from '@console/shared/src/test-utils/utils';
import { COMMON_TEMPLATES_NAMESPACE, VM_BOOTUP_TIMEOUT_SECS } from './utils/constants/common';
import { multusNAD, getTestDataVolume, flavorConfigs } from './mocks/mocks';
import { VirtualMachine } from './models/virtualMachine';
import { TemplateByName } from './utils/constants/wizard';
import { Wizard } from './models/wizard';
import { VMT_ACTION } from './utils/constants/vm';
import { VMTemplateBuilder } from './models/vmtemplateBuilder';
import { getBasicVMTBuilder, VMTemplatePresets } from './mocks/vmBuilderPresets';
import { VMBuilder } from './models/vmBuilder';
import { ProvisionSource } from './utils/constants/enums/provisionSource';

describe('Create VM from Template using wizard', () => {
  const leakedResources = new Set<string>();
  const testDataVolume = getTestDataVolume();
  const wizard = new Wizard();
  const VMTemplateTestCaseIDs = {
    'ID(CNV-871)': VMTemplatePresets[ProvisionSource.CONTAINER.getValue()],
    'ID(CNV-4095)': VMTemplatePresets[ProvisionSource.DISK.getValue()],
    'ID(CNV-1503)': VMTemplatePresets[ProvisionSource.URL.getValue()],
    'ID(CNV-4094)': VMTemplatePresets[ProvisionSource.PXE.getValue()],
  };

  beforeAll(() => {
    createResources([multusNAD, testDataVolume]);
  });

  afterAll(() => {
    deleteResources([multusNAD, testDataVolume]);
  });

  afterEach(() => {
    removeLeakedResources(leakedResources);
  });

  for (const [id, vmt] of Object.entries(VMTemplateTestCaseIDs)) {
    const method = vmt.getData().provisionSource.getValue();
    it(
      `${id} Create VM Template using ${method}.`,
      async () => {
        await vmt.create();
        await withResource(leakedResources, vmt.asResource(), async () => {
          const vm = new VMBuilder()
            .setNamespace(testName)
            .setDescription(`VM from template ${vmt.name}`)
            .setFlavor(flavorConfigs.Tiny)
            .setTemplate(vmt.name)
            .setDisks(vmt.getData().disks)
            .build();
          await withResource(leakedResources, vm.asResource(), async () => {
            await vm.create();
          });
        });
      },
      VM_BOOTUP_TIMEOUT_SECS * 2,
    );
  }

  it('ID(CNV-1847) Displays correct data on VM Template Details page', async () => {
    const vmt = new VMTemplateBuilder(getBasicVMTBuilder())
      .setProvisionSource(ProvisionSource.CONTAINER)
      .build();
    const vmtData = vmt.getData();

    await withResource(leakedResources, vmt.asResource(), async () => {
      await vmt.create();
      await vmt.navigateToDetail();

      const expectation = {
        name: vmtData.name,
        description: vmtData.description,
        os: vmtData.os,
        profile: vmtData.workload.toLowerCase(),
        bootOrder: ['rootdisk (Disk)'],
        flavor: `${vmtData.flavor.flavor}: 1 vCPU, 1 GiB Memory`,
      };

      const found = {
        name: await resourceTitle.getText(),
        description: await detailView.vmDetailDesc(testName, vmt.name).getText(),
        os: await detailView.vmDetailOS(testName, vmt.name).getText(),
        profile: await detailView.vmDetailWorkloadProfile(testName, vmt.name).getText(),
        bootOrder: await detailView.vmDetailBootOrder(testName, vmt.name).getText(),
        flavor: await detailView.vmDetailFlavor(testName, vmt.name).getText(),
      };

      const equal = isEqual(found, expectation);
      if (!equal) {
        // eslint-disable-next-line no-console
        console.error(`Expected:\n${JSON.stringify(expectation)},\nGot:\n${JSON.stringify(found)}`);
      }
      expect(equal).toBe(true);
    });
  });

  describe('Create VM from Template using Template actions', () => {
    const vmTemplate = new VMTemplateBuilder(getBasicVMTBuilder())
      .setName(TemplateByName.RHEL8)
      .setProvisionSource(ProvisionSource.CONTAINER)
      .setNamespace(COMMON_TEMPLATES_NAMESPACE)
      .build();

    let vm: VirtualMachine;

    afterEach(() => {
      deleteResource(vm.asResource());
    });

    // mark these 2 tests skip.
    // TODO: remove them if actions not in actions dropdown.
    xit('ID(CNV-4202) Creates VM using VM Template actions dropdown ', async () => {
      vm = new VMBuilder()
        .setName('vm-from-vmt-detail')
        .setNamespace(testName)
        .setFlavor(flavorConfigs.Tiny)
        .setTemplate(vmTemplate.name)
        .build();

      await vmTemplate.action(VMT_ACTION.Create);
      await wizard.processWizard(vm.getData());
    });

    xit('ID(CNV-4097) Creates VM using VM Template kebab menu ', async () => {
      vm = new VMBuilder()
        .setName('vm-from-vmt-list')
        .setNamespace(testName)
        .setFlavor(flavorConfigs.Tiny)
        .build();

      await vmTemplate.listViewAction(VMT_ACTION.Create);
      await wizard.processWizard(vm.getData());
    });

    it('ID(CNV-4290) Creates VM using VM Template create virtual machine link', async () => {
      vm = new VMBuilder()
        .setName('vm-from-vmt-createlink')
        .setNamespace(testName)
        .setTemplate(vmTemplate.name)
        .setTemplateNamespace(vmTemplate.namespace)
        .setProvisionSource(ProvisionSource.CONTAINER)
        .build();

      await vm.create();
    });
  });
});
