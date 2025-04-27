import { ImageBlockSpec } from '@blocksuite/affine/blocks/image';
import { ToolbarModuleExtension } from '@blocksuite/affine/shared/services';
import { BlockFlavourIdentifier } from '@blocksuite/affine/std';
import type { ExtensionType } from '@blocksuite/affine/store';

import { imageToolbarAIEntryConfig } from '../entries/image-toolbar/setup-image-toolbar';

export const AIImageBlockSpec: ExtensionType[] = [
  ...ImageBlockSpec,
  ToolbarModuleExtension({
    id: BlockFlavourIdentifier('custom:affine:image'),
    config: imageToolbarAIEntryConfig(),
  }),
];
