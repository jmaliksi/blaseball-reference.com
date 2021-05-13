import { commonBattingStatColumns } from "components/BattingStatTable";
import * as React from "react";

import { Cell, Column } from "react-table";
import StatSplit from "types/statSplit";
import TeamStats from "types/teamStats";

import { Flex, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import Table from "components/Table";
import { Tooltip } from "@chakra-ui/react";

type StatTableProps = {
  battingStats: TeamStats;
  isPostseason?: boolean;
  splitView: string | number;
  statTargetName: string;
};

export default function TeamBattingStatTable({
  battingStats,
  isPostseason = false,
  splitView,
  statTargetName,
}: StatTableProps) {
  const data = React.useMemo<StatSplit[]>(() => battingStats.splits, [
    isPostseason,
    splitView,
    statTargetName,
  ]);

  const columns = React.useMemo<
    Column<StatSplit & { name: typeof NextLink | null }>[]
  >(
    () => [
      {
        accessor: (row) => row.team.full_name,
        id: "name",
        Header: () => (
          <Tooltip hasArrow label="Team" placement="top">
            Team
          </Tooltip>
        ),
        Cell: ({ row, value }: Cell<StatSplit>) => {
          return row.original?.team?.team_id ? (
            <NextLink href={`/teams/${row.original.team.team_id}`} passHref>
              <Link>{value}</Link>
            </NextLink>
          ) : null;
        },
      },
      // @ts-expect-error: Type not assignable error
      ...commonBattingStatColumns(),
    ],
    []
  );

  return (
    <Table columns={columns} data={data}>
      <Flex alignContent="baseline" justifyContent="space-between">
        <Table.Heading level="h3" size="sm">
          Batting Stats
        </Table.Heading>
        <Flex alignItems="center">
          <Table.CSVExport
            filename={`${statTargetName} ${splitView} ${
              isPostseason ? "Postseason" : "Standard"
            } Batting Stats.csv`}
          />
        </Flex>
      </Flex>

      {Array.isArray(data) && data.length > 0 ? (
        <Table.Content />
      ) : (
        "Sorry, no results available for this season."
      )}
    </Table>
  );
}
