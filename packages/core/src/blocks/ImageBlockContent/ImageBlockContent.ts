import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockFromConfig,
  createBlockSpec,
  FileBlockConfig,
  Props,
  PropSchema,
} from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import { parseFigureElement } from "../FileBlockContent/helpers/parse/parseFigureElement.js";
import { createFigureWithCaption } from "../FileBlockContent/helpers/toExternalHTML/createFigureWithCaption.js";
import { createLinkWithCaption } from "../FileBlockContent/helpers/toExternalHTML/createLinkWithCaption.js";
import { createResizableFileBlockWrapper } from "../FileBlockContent/helpers/render/createResizableFileBlockWrapper.js";
import { parseImageElement } from "./parseImageElement.js";

export const FILE_IMAGE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z"></path></svg>';

export const imagePropSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // File name.
  name: {
    default: "" as const,
  },
  // File url.
  url: {
    default: "" as const,
  },
  // File caption.
  caption: {
    default: "" as const,
  },

  showPreview: {
    default: true,
  },
  // File preview width in px.
  previewWidth: {
    default: undefined,
    type: "number",
  },
} satisfies PropSchema;

export const imageBlockConfig = {
  type: "image" as const,
  propSchema: imagePropSchema,
  content: "none",
  isFileBlock: true,
  fileBlockAccept: ["image/*"],
} satisfies FileBlockConfig;

export const imageRender = (
  block: BlockFromConfig<typeof imageBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
) => {
  const icon = document.createElement("div");
  icon.innerHTML = FILE_IMAGE_ICON_SVG;

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "bn-visual-media-wrapper";

  const image = document.createElement("img");
  image.className = "bn-visual-media";
  if (editor.resolveFileUrl) {
    editor.resolveFileUrl(block.props.url).then((downloadUrl) => {
      image.src = downloadUrl;
    });
  } else {
    image.src = block.props.url;
  }

  image.alt = block.props.name || block.props.caption || "BlockNote image";
  image.contentEditable = "false";
  image.draggable = false;
  imageWrapper.appendChild(image);

  return createResizableFileBlockWrapper(
    block,
    editor,
    { dom: imageWrapper },
    imageWrapper,
    editor.dictionary.file_blocks.image.add_button_text,
    icon.firstElementChild as HTMLElement,
  );
};

export const imageParse = (
  element: HTMLElement,
): Partial<Props<typeof imageBlockConfig.propSchema>> | undefined => {
  if (element.tagName === "IMG") {
    // Ignore if parent figure has already been parsed.
    if (element.closest("figure")) {
      return undefined;
    }

    return parseImageElement(element as HTMLImageElement);
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigureElement(element, "img");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    return {
      ...parseImageElement(targetElement as HTMLImageElement),
      caption,
    };
  }

  return undefined;
};

export const imageToExternalHTML = (
  block: BlockFromConfig<typeof imageBlockConfig, any, any>,
) => {
  if (!block.props.url) {
    const div = document.createElement("p");
    div.textContent = "Add image";

    return {
      dom: div,
    };
  }

  let image;
  if (block.props.showPreview) {
    image = document.createElement("img");
    image.src = block.props.url;
    image.alt = block.props.name || block.props.caption || "BlockNote image";
    if (block.props.previewWidth) {
      image.width = block.props.previewWidth;
    }
  } else {
    image = document.createElement("a");
    image.href = block.props.url;
    image.textContent = block.props.name || block.props.url;
  }

  if (block.props.caption) {
    if (block.props.showPreview) {
      return createFigureWithCaption(image, block.props.caption);
    } else {
      return createLinkWithCaption(image, block.props.caption);
    }
  }

  return {
    dom: image,
  };
};

export const ImageBlock = createBlockSpec(imageBlockConfig, {
  render: imageRender,
  parse: imageParse,
  toExternalHTML: imageToExternalHTML,
});
