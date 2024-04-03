import { Tooltip } from '@affine/component/ui/tooltip';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { CloseIcon, NewIcon } from '@blocksuite/icons';
import {
  DocsService,
  GlobalContextService,
  useLiveData,
  useService,
} from '@toeverything/infra';
import { useSetAtom } from 'jotai/react';
import { useCallback, useState } from 'react';

import { openSettingModalAtom } from '../../../atoms';
import type { SettingProps } from '../../affine/setting-modal';
import { ContactIcon, HelpIcon, KeyboardIcon } from './icons';
import {
  StyledAnimateWrapper,
  StyledIconWrapper,
  StyledIsland,
  StyledTriggerWrapper,
} from './style';

const DEFAULT_SHOW_LIST: IslandItemNames[] = [
  'whatNew',
  'contact',
  'shortcuts',
];

const DESKTOP_SHOW_LIST: IslandItemNames[] = [...DEFAULT_SHOW_LIST];
type IslandItemNames = 'whatNew' | 'contact' | 'shortcuts';

const showList = environment.isDesktop ? DESKTOP_SHOW_LIST : DEFAULT_SHOW_LIST;

export const HelpIsland = () => {
  const docId = useLiveData(
    useService(GlobalContextService).globalContext.docId.$
  );
  const docRecordList = useService(DocsService).docRecordList;
  const doc = useLiveData(docId ? docRecordList.record$(docId) : undefined);
  const mode = useLiveData(doc?.mode$);
  const setOpenSettingModalAtom = useSetAtom(openSettingModalAtom);
  const [spread, setShowSpread] = useState(false);
  const t = useAFFiNEI18N();
  const openSettingModal = useCallback(
    (tab: SettingProps['activeTab']) => {
      setShowSpread(false);

      setOpenSettingModalAtom({
        open: true,
        activeTab: tab,
      });
    },
    [setOpenSettingModalAtom]
  );
  const openAbout = useCallback(
    () => openSettingModal('about'),
    [openSettingModal]
  );
  const openShortcuts = useCallback(
    () => openSettingModal('shortcuts'),
    [openSettingModal]
  );

  return (
    <StyledIsland
      spread={spread}
      data-testid="help-island"
      onClick={() => {
        setShowSpread(!spread);
      }}
      inEdgelessPage={!!docId && mode === 'edgeless'}
    >
      <StyledAnimateWrapper
        style={{ height: spread ? `${showList.length * 40 + 4}px` : 0 }}
      >
        {showList.includes('whatNew') && (
          <Tooltip content={t['com.affine.appUpdater.whatsNew']()} side="left">
            <StyledIconWrapper
              data-testid="right-bottom-change-log-icon"
              onClick={() => {
                window.open(runtimeConfig.changelogUrl, '_blank');
              }}
            >
              <NewIcon />
            </StyledIconWrapper>
          </Tooltip>
        )}
        {showList.includes('contact') && (
          <Tooltip content={t['com.affine.helpIsland.contactUs']()} side="left">
            <StyledIconWrapper
              data-testid="right-bottom-contact-us-icon"
              onClick={openAbout}
            >
              <ContactIcon />
            </StyledIconWrapper>
          </Tooltip>
        )}
        {showList.includes('shortcuts') && (
          <Tooltip
            content={t['com.affine.keyboardShortcuts.title']()}
            side="left"
          >
            <StyledIconWrapper
              data-testid="shortcuts-icon"
              onClick={openShortcuts}
            >
              <KeyboardIcon />
            </StyledIconWrapper>
          </Tooltip>
        )}
      </StyledAnimateWrapper>

      {spread ? (
        <StyledTriggerWrapper spread>
          <CloseIcon />
        </StyledTriggerWrapper>
      ) : (
        <Tooltip
          content={t['com.affine.helpIsland.helpAndFeedback']()}
          side="left"
        >
          <StyledTriggerWrapper data-testid="faq-icon">
            <HelpIcon />
          </StyledTriggerWrapper>
        </Tooltip>
      )}
    </StyledIsland>
  );
};
