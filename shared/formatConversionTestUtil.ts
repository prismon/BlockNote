// TODO: remove duplicate file

import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
  PartialBlock,
  PartialInlineContent,
  PartialTableCell,
  StyledText,
  StyleSchema,
  TableCell,
  TableContent,
  UniqueID,
} from "@blocknote/core";

function textShorthandToStyledText(
  content: string | StyledText<any>[] = "",
): StyledText<any>[] {
  if (typeof content === "string") {
    return [
      {
        type: "text",
        text: content,
        styles: {},
      },
    ];
  }
  return content;
}

function partialContentToInlineContent(
  content:
    | PartialInlineContent<any, any>
    | PartialTableCell<any, any>
    | TableContent<any>
    | undefined,
):
  | InlineContent<any, any>[]
  | TableContent<any>
  | TableCell<any, any>
  | undefined {
  if (typeof content === "string") {
    return textShorthandToStyledText(content);
  }

  if (Array.isArray(content)) {
    return content.flatMap((partialContent) => {
      if (typeof partialContent === "string") {
        return textShorthandToStyledText(partialContent);
      } else if (isPartialLinkInlineContent(partialContent)) {
        return {
          ...partialContent,
          content: textShorthandToStyledText(partialContent.content),
        };
      } else if (isStyledTextInlineContent(partialContent)) {
        return partialContent;
      } else {
        // custom inline content

        return {
          props: {},
          ...partialContent,
          content: partialContentToInlineContent(partialContent.content),
        } as any;
      }
    });
  } else if (content?.type === "tableContent") {
    return {
      type: "tableContent",
      columnWidths: content.columnWidths,
      headerRows: content.headerRows,
      headerCols: content.headerCols,
      rows: content.rows.map((row) => {
        const cells: any[] = row.cells.map((cell) => {
          if (!("type" in cell) || cell.type !== "tableCell") {
            return partialContentToInlineContent({
              type: "tableCell",
              content: cell as any,
            });
          }
          return partialContentToInlineContent(cell);
        });

        return {
          ...row,
          cells,
        };
      }),
    };
  } else if (content?.type === "tableCell") {
    return {
      type: "tableCell",
      content: partialContentToInlineContent(content.content) as any[],
      props: {
        backgroundColor: content.props?.backgroundColor ?? "default",
        textColor: content.props?.textColor ?? "default",
        textAlignment: content.props?.textAlignment ?? "left",
        colspan: content.props?.colspan ?? 1,
        rowspan: content.props?.rowspan ?? 1,
      },
    } satisfies TableCell<any, any>;
  }

  return content;
}

export function partialBlocksToBlocksForTesting<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BlockNoteSchema<BSchema, I, S>,
  partialBlocks: Array<PartialBlock<NoInfer<BSchema>, NoInfer<I>, NoInfer<S>>>,
): Array<Block<BSchema, I, S>> {
  return partialBlocks.map((partialBlock) =>
    partialBlockToBlockForTesting(schema.blockSchema, partialBlock),
  );
}

export function partialBlockToBlockForTesting<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BSchema,
  partialBlock: PartialBlock<BSchema, I, S>,
): Block<BSchema, I, S> {
  const contentType: "inline" | "table" | "none" =
    schema[partialBlock.type!].content;

  const withDefaults: Block<BSchema, I, S> = {
    id: "",
    type: partialBlock.type!,
    props: {} as any,
    content:
      contentType === "inline"
        ? []
        : contentType === "table"
          ? {
              type: "tableContent",
              columnWidths: undefined,
              headerRows: undefined,
              headerCols: undefined,
              rows: [],
            }
          : (undefined as any),
    children: [] as any,
    ...partialBlock,
  };

  Object.entries(schema[partialBlock.type!].propSchema).forEach(
    ([propKey, propValue]) => {
      if (
        withDefaults.props[propKey] === undefined &&
        propValue.default !== undefined
      ) {
        (withDefaults.props as any)[propKey] = propValue.default;
      }
    },
  );

  if (contentType === "inline") {
    const content = withDefaults.content as InlineContent<I, S>[] | undefined;
    withDefaults.content = partialContentToInlineContent(content) as any;
  } else if (contentType === "table") {
    const content = withDefaults.content as TableContent<I, S> | undefined;
    withDefaults.content = {
      type: "tableContent",
      columnWidths:
        content?.columnWidths ||
        content?.rows[0]?.cells.map(() => undefined) ||
        [],
      headerRows: content?.headerRows || undefined,
      headerCols: content?.headerCols || undefined,
      rows:
        content?.rows.map((row) => ({
          cells: row.cells.map((cell) => partialContentToInlineContent(cell)),
        })) || [],
    } as any;
  }

  return {
    ...withDefaults,
    content: partialContentToInlineContent(withDefaults.content),
    children: withDefaults.children.map((c) => {
      return partialBlockToBlockForTesting(schema, c);
    }),
  } as any;
}

export function addIdsToBlock(block: PartialBlock<any, any, any>) {
  if (!block.id) {
    block.id = UniqueID.options.generateID();
  }
  if (block.children) {
    addIdsToBlocks(block.children);
  }
}

export function addIdsToBlocks(blocks: PartialBlock<any, any, any>[]) {
  for (const block of blocks) {
    addIdsToBlock(block);
  }
}
