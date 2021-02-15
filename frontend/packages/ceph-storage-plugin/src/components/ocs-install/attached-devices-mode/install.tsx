import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { match as RouterMatch } from 'react-router';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { Alert, Button } from '@patternfly/react-core';
import {
  StorageClassResourceKind,
  K8sResourceKind,
  k8sList,
  referenceForModel,
} from '@console/internal/module/k8s';
import { history, LoadingBox } from '@console/internal/components/utils';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from '@console/internal/components/utils/k8s-watch-hook';
import { StorageClassModel } from '@console/internal/models';
import { ClusterServiceVersionModel, SubscriptionModel } from '@console/operator-lifecycle-manager';
import { getNamespace } from '@console/shared';
import { filterSCWithNoProv } from '../../../utils/install';
import CreateStorageClusterWizard from './install-wizard';
import { getOperatorVersion } from '../../../selectors';
import { LSO_OPERATOR } from '../../../constants';
import './attached-devices.scss';

const goToLSOInstallationPage = () =>
  history.push(
    '/operatorhub/all-namespaces?details-item=local-storage-operator-redhat-operators-openshift-marketplace',
  );

export const CreateAttachedDevicesCluster: React.FC<CreateAttachedDevicesClusterProps> = ({
  match,
  mode,
}) => {
  const { t } = useTranslation();

  const { appName, ns } = match.params;
  const [hasNoProvSC, setHasNoProvSC] = React.useState(false);
  const [lsoSubscription, setLsoSubscription] = React.useState<K8sResourceKind>();
  const isDataLoaded = React.useRef(false);
  const lsoNs = getNamespace(lsoSubscription);
  const lsoVersion = getOperatorVersion(lsoSubscription);

  const subscriptionResource: WatchK8sResource = {
    kind: referenceForModel(SubscriptionModel),
    isList: true,
  };
  const [subscription, subscriptionLoaded, subscriptionLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(subscriptionResource);

  const csvResource = {
    kind: referenceForModel(ClusterServiceVersionModel),
    name: lsoVersion,
    namespaced: true,
    namespace: lsoNs,
    isList: false,
  };
  const [csv, csvLoaded, csvLoadError] = useK8sWatchResource<K8sResourceKind>(csvResource);

  if (subscriptionLoaded && csvLoaded) isDataLoaded.current = true;
  const isLsoCsvSucceeded = (lsoNs && lsoVersion && csv?.status?.phase === 'Succeeded') || false;

  React.useEffect(() => {
    setLsoSubscription(subscription.find((item) => item?.spec?.name === LSO_OPERATOR));
  }, [subscription]);

  React.useEffect(() => {
    /* this call can't be watched here as watching will take the user back to this view 
    once a sc gets created from ocs install in case of no sc present */
    k8sList(StorageClassModel)
      .then((storageClasses: StorageClassResourceKind[]) => {
        const filteredSCData = storageClasses.filter(filterSCWithNoProv);
        if (filteredSCData.length) {
          setHasNoProvSC(true);
        }
      })
      .catch(() => setHasNoProvSC(false));
  }, [appName, ns]);

  return !isDataLoaded.current && !subscriptionLoadError && !csvLoadError ? (
    <LoadingBox />
  ) : subscriptionLoadError || csvLoadError || !lsoSubscription || !isLsoCsvSucceeded ? (
    <Alert
      className="co-alert ceph-ocs-install__lso-install-alert"
      variant="info"
      title="Local Storage Operator Not Installed"
      isInline
    >
      <Trans t={t} ns="ceph-storage-plugin">
        Before we can create a storage cluster, the local storage operator needs to be installed.
        When installation is finished come back to OpenShift Container Storage to create a storage
        cluster.
        <div className="ceph-ocs-install__lso-alert__button">
          <Button type="button" variant="primary" onClick={goToLSOInstallationPage}>
            Install
          </Button>
        </div>
      </Trans>
    </Alert>
  ) : (
    <CreateStorageClusterWizard
      hasNoProvSC={hasNoProvSC}
      setHasNoProvSC={setHasNoProvSC}
      match={match}
      lsoNs={lsoNs}
      mode={mode}
    />
  );
};

type CreateAttachedDevicesClusterProps = {
  match: RouterMatch<{ appName: string; ns: string }>;
  mode: string;
};
