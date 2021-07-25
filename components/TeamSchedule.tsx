import Color from "tinycolor2";
import * as React from "react";
import renderTeamEmoji from "utils/renderTeamEmoji";
import useForbiddenKnowledge from "hooks/useForbiddenKnowledge";

import ChroniclerGame from "types/chroniclerGame";
import DailySchedule from "types/dailySchedule";
import Game from "types/game";
import SeasonStartDates from "types/seasonStartDates";
import Team from "types/team";

import {
  Box,
  Circle,
  Flex,
  Heading,
  Link,
  SimpleGrid,
  Skeleton,
  Stack,
  Square,
  Text,
  VisuallyHidden,
  useColorModeValue,
  useColorMode,
} from "@chakra-ui/react";
import ForbiddenKnowledgeToggle from "components/ForbiddenKnowledgeToggle";
import NextLink from "next/link";
import { WeatherIcon, WeatherName } from "components/Weather";

type TeamScheduleProps = {
  schedule: ChroniclerGame[];
  scheduleIsValidating: boolean;
  seasonStartDates: SeasonStartDates;
  selectedSeason: number;
  team: Team;
  teams: Team[];
};

export default function TeamSchedule({
  schedule,
  scheduleIsValidating,
  seasonStartDates,
  selectedSeason,
  team,
  teams,
}: TeamScheduleProps) {
  const [showForbiddenKnowledge] = useForbiddenKnowledge();

  /**
   * Group games into daily buckets (e.g., Aug. 1, games 1-12; Aug. 2, games 13-36; ...)
   *
   * Assumptions:
   * - A season start date has been recorded by the B-R API.
   * - A team can potentially play multiple games during the same game day, so we also
   *   store each game in an hourly bucket and append when necessary.
   * - Each game day progresses the clock by one hour, except:
   * - - After season 11, where each season has the same earlsiesta and latesiesta times.
   * - The postseason begins on Saturdays at UTC hour 13, except:
   * - - During and after season 11, when the first two rounds take place on Fridays
   *  */
  const seasonScheduleByDate = React.useMemo(() => {
    if (
      scheduleIsValidating ||
      schedule == null ||
      selectedSeason == null ||
      seasonStartDates == null
    ) {
      return;
    }

    const seasonStartDate = new Date(`${seasonStartDates[selectedSeason]} UTC`);
    const gamesByDay: DailySchedule[] = [];

    const currGameDate = seasonStartDate;
    let prevGame: Game & { visibleOnSite: boolean };
    let previousGameHasStarted = false;
    let postseasonHasStarted = false;
    let postseasonRound = 0;

    for (const { data: game } of schedule) {
      const isNewGameDay = prevGame?.day !== game.day;
      // Advance time with each new gay of games, not including day 0
      if (isNewGameDay && game.day > 0 && game.day < 99) {
        let advanceHourBy = 1;

        // Add an hour for earlsiesta and latesiesta
        if (selectedSeason >= 11 && (game.day === 27 || game.day === 72)) {
          advanceHourBy += 1;
        }

        currGameDate.setHours(currGameDate.getHours() + advanceHourBy);
      } else if (isNewGameDay && game.day >= 99) {
        /**
         * For the first postseason game, advance day of month and set hour to 13 UTC (11 AM EST), except:
         *  - During and after season 9, where the wildcard round of the postseason takes place an
         *    hour after the end of the season on Friday [Phase 6, Series of 3].
         *    The postseason then continues on Saturdays at 15 UTC (1 PM EST) [Phase 6, Series of 5].
         *  - During and after season 11, where the wildcard round and divisional rounds of the postseason
         *    take place an hour after the season on Friday [Phase 6, Requiring 2 and 3 Wins Respectively].
         *    The postseason then continues on Saturdays at 13 UTC (11 AM EST) [First Game Phase 0 (?), then Phase 6].
         *    (Exceptions: Season 13 postseason continued on Saturday at 10 AM EST)
         */

        // The general guiding logic below is to find the game day that kicks off the next day, though this does not
        // account for day spillovers yet as well as conditions where postseason days are skipped due to waiting for
        // other teams to finish their games (!).
        if (postseasonHasStarted === false) {
          if (game.season < 8) {
            currGameDate.setDate(currGameDate.getDate() + 1);
            currGameDate.setUTCHours(13);
          } else if (game.season >= 8) {
            currGameDate.setHours(currGameDate.getHours() + 2);

            // If the start of the team's postseason is not game 99, they bypassed round 1 and will start at a
            // later hour
            if (game.day > 99) {
              postseasonRound += 1;
              currGameDate.setHours(currGameDate.getHours() + (game.day - 99));
            }
          }

          postseasonHasStarted = true;
          postseasonRound += 1;
        } else {
          if (game.season < 8) {
            currGameDate.setHours(currGameDate.getHours() + 1);
          } else if (game.season >= 8 && game.season < 11) {
            // Advance to next day on start of round 2
            if (postseasonRound === 1 && game.seriesIndex === 1) {
              currGameDate.setDate(currGameDate.getDate() + 1);
              currGameDate.setUTCHours(15);

              postseasonRound += 1;
            } else {
              currGameDate.setHours(currGameDate.getHours() + 1);
            }
          } else if (game.season >= 11) {
            if (game.seriesIndex === 1) {
              postseasonRound += 1;
            }

            // Find the start of the third round, and advance to Saturday
            if (game.seriesIndex === 1 && postseasonRound === 3) {
              currGameDate.setDate(currGameDate.getDate() + 1);

              // Exception for season 13, which started an hour early
              if (game.season === 12) {
                currGameDate.setUTCHours(14);
              } else {
                currGameDate.setUTCHours(15);
              }
            } else {
              currGameDate.setHours(currGameDate.getHours() + 1);
            }
          }
        }
      }

      const currDayOfMonth = currGameDate.getDate();
      const currHourOfDay = currGameDate.getHours();
      const currDayGames = gamesByDay.find(
        (dayGames) => dayGames.dayOfMonth === currDayOfMonth
      );
      const isNewDayOfMonth = currDayGames === undefined;

      const visibleOnSite = previousGameHasStarted || game.gameStart;
      const gameWithVisibilityStatus = { ...game, visibleOnSite };
      previousGameHasStarted = Boolean(game.gameStart);

      // Create day of month bucket if it doesn't exist, otherwise append games to hourly bucket
      if (isNewDayOfMonth) {
        gamesByDay.push({
          dayOfMonth: currDayOfMonth,
          startingDate: new Date(currGameDate),
          gamesByHourOfDay: {
            [currHourOfDay]: [gameWithVisibilityStatus],
          },
        });
      } else {
        const isNewHourOfDay = !Object.prototype.hasOwnProperty.call(
          currDayGames.gamesByHourOfDay,
          currHourOfDay
        );

        if (isNewHourOfDay) {
          currDayGames.gamesByHourOfDay = {
            ...currDayGames.gamesByHourOfDay,
            [currHourOfDay]: [gameWithVisibilityStatus],
          };
        } else {
          currDayGames.gamesByHourOfDay[currHourOfDay].push(
            gameWithVisibilityStatus
          );
        }
      }

      prevGame = gameWithVisibilityStatus;
    }

    return gamesByDay;
  }, [scheduleIsValidating, seasonStartDates, selectedSeason, schedule]);

  if (
    scheduleIsValidating ||
    seasonScheduleByDate == null ||
    team == null ||
    teams == null
  ) {
    return <TeamDailyScheduleLoading />;
  }

  return (
    <>
      <TeamDailySchedule
        dailySchedule={seasonScheduleByDate}
        showForbiddenKnowledge={showForbiddenKnowledge}
        team={team}
        teams={teams}
      />
      <TeamDailyScheduleKey team={team} />
      <ForbiddenKnowledgeToggle />
    </>
  );
}

function TeamDailyScheduleLoading() {
  return (
    <>
      <Flex mb={4}>
        <Skeleton
          startColor="gray.500"
          endColor="black"
          height={6}
          width={20}
        />
      </Flex>
      <Stack>
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
      </Stack>
    </>
  );
}

function TeamDailySchedule({
  dailySchedule,
  showForbiddenKnowledge,
  team,
  teams,
}: {
  dailySchedule: DailySchedule[];
  showForbiddenKnowledge: boolean;
  team: Team;
  teams: Team[];
}) {
  const colorMode = useColorMode().colorMode;

  const homeGameBackgroundColor = getHomeBackgroundColor({ team });
  const awayGameBackgroundColor = useColorModeValue("gray.50", "gray.700");
  const hasDarkHomeGameBackgroundColor = Color(
    homeGameBackgroundColor
  ).isDark();
  let homeGameFontColor = null;

  if (hasDarkHomeGameBackgroundColor) {
    homeGameFontColor = "white";
  } else if (colorMode === "dark") {
    homeGameFontColor = "gray.900";
  }

  return (
    <>
      {dailySchedule.map((day) => (
        <Box key={day.startingDate.toString()} mb={4}>
          <Heading as="h2" mb={4} size="md">
            {day.startingDate.toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Heading>
          <SimpleGrid
            backgroundColor="black"
            borderRight="1px solid"
            borderBottom="1px solid"
            borderColor="black"
            columns={{ base: 3, md: 6 }}
          >
            {Object.keys(day.gamesByHourOfDay)
              .sort((a, b) => Number(a) - Number(b))
              .map((hour) => {
                const dayStartingTime = new Date(day.startingDate);
                dayStartingTime.setHours(Number(hour));

                if (
                  Array.isArray(day.gamesByHourOfDay[hour]) &&
                  day.gamesByHourOfDay[hour].length === 0
                ) {
                  return null;
                }

                // Use first game to determine day cell's background and game day
                const isHomeDay =
                  day.gamesByHourOfDay[hour][0].homeTeam === team.team_id;
                const currGameDay = day.gamesByHourOfDay[hour][0].day;

                return (
                  <Box
                    backgroundColor="white"
                    borderLeft="1px solid"
                    borderTop="1px solid"
                    borderColor="black"
                    key={currGameDay}
                  >
                    <Box
                      background={
                        isHomeDay
                          ? homeGameBackgroundColor
                          : awayGameBackgroundColor
                      }
                      color={isHomeDay ? homeGameFontColor : null}
                      height="full"
                      minHeight={{ base: "auto", md: 40 }}
                      padding={{ base: 2, md: 4 }}
                    >
                      <Flex mb={2} fontSize="sm" justifyContent="space-between">
                        <Box>{Number(currGameDay) + 1}</Box>

                        <Box>
                          {dayStartingTime.toLocaleString(undefined, {
                            hour: "numeric",
                            hour12: true,
                          })}
                        </Box>
                      </Flex>
                      {day.gamesByHourOfDay[hour].map((game) => {
                        const isHomeTeam = game.homeTeam === team.team_id;
                        const isWinningTeam = isHomeTeam
                          ? game.homeScore > game.awayScore
                          : game.awayScore > game.homeScore;
                        const opposingTeam = teams.find(
                          (team) =>
                            team.team_id ===
                            (isHomeTeam ? game.awayTeam : game.homeTeam)
                        );

                        return (
                          <Flex
                            alignItems="center"
                            direction="column"
                            justifyContent="center"
                            key={game.id}
                          >
                            <Circle
                              background={opposingTeam.team_main_color}
                              border="1px solid"
                              borderColor="gray.500"
                              mb={2}
                              size={{ base: 6, md: 12 }}
                            >
                              <Text
                                as="span"
                                fontSize={{ base: "sm", md: "2xl" }}
                                role="img"
                              >
                                {renderTeamEmoji(opposingTeam.team_emoji)}
                              </Text>
                            </Circle>
                            <Box
                              fontSize="sm"
                              fontWeight="bold"
                              textAlign="center"
                            >
                              {game.homeTeam === team.team_id ? (
                                <>
                                  vs.{" "}
                                  <NextLink
                                    href={`/teams/${opposingTeam.url_slug}/schedule`}
                                    passHref
                                  >
                                    <Link>
                                      {opposingTeam.nickname}{" "}
                                      <VisuallyHidden>
                                        team schedule
                                      </VisuallyHidden>
                                    </Link>
                                  </NextLink>
                                </>
                              ) : (
                                <>
                                  @{" "}
                                  <NextLink
                                    href={`/teams/${opposingTeam.url_slug}/schedule`}
                                    passHref
                                  >
                                    <Link>
                                      {opposingTeam.nickname}{" "}
                                      <VisuallyHidden>
                                        team schedule
                                      </VisuallyHidden>
                                    </Link>
                                  </NextLink>
                                </>
                              )}
                            </Box>
                            {game.gameComplete ? (
                              <Box fontSize="sm" textAlign="center">
                                <Text as="span" fontWeight="bold">
                                  {isWinningTeam ? "W" : "L"},{" "}
                                </Text>
                                <NextLink
                                  href={`${process.env.NEXT_PUBLIC_REBLASE}/game/${game.id}`}
                                  passHref
                                >
                                  <Link isExternal>
                                    {game.awayScore} - {game.homeScore}
                                    <VisuallyHidden>
                                      view game in Reblase
                                    </VisuallyHidden>
                                  </Link>
                                </NextLink>
                              </Box>
                            ) : null}
                            {game.visibleOnSite || showForbiddenKnowledge ? (
                              <Flex
                                alignItems="center"
                                fontSize={{ base: "xs", md: "sm" }}
                                mt={{ base: 2, md: 3 }}
                              >
                                <WeatherIcon for={game.weather} />
                                <Box ml={1}>
                                  <WeatherName for={game.weather} />
                                </Box>
                              </Flex>
                            ) : null}
                          </Flex>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
          </SimpleGrid>
        </Box>
      ))}
    </>
  );
}

function TeamDailyScheduleKey({ team }: { team: Team }) {
  const homeGameBackgroundColor = getHomeBackgroundColor({ team });
  const formattedUserTimezone = Intl.DateTimeFormat(undefined, {
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type == "timeZoneName").value;

  return (
    <Flex
      alignItems={{ base: "center", md: "normal" }}
      direction={{ base: "column", md: "row" }}
      fontSize="sm"
      justifyContent={{ base: "normal", md: "space-between" }}
    >
      <Box mb={{ base: 2, md: 0 }}>
        All times {formattedUserTimezone}. Subject to change.
      </Box>
      <Flex direction="row">
        <Flex direction="row" mr={2}>
          <Square
            background={homeGameBackgroundColor}
            border="1px solid"
            borderColor="gray.700"
            mr={1}
            size={6}
          />
          <Box>- Home</Box>
        </Flex>
        <Flex direction="row">
          <Square
            background="gray.50"
            border="1px solid"
            borderColor="gray.700"
            mr={1}
            size={6}
          />
          <Box>- Away</Box>
        </Flex>
      </Flex>
    </Flex>
  );
}

// Find a suitable background color to be used to distinguish home games from away games
// - Away games use light gray in light mode and medium gray in dark mode
function getHomeBackgroundColor({ team }: { team: Team }) {
  if (
    team == null ||
    team.team_main_color == null ||
    team.team_secondary_color == null
  ) {
    // Default to teal if data is unavailable
    return "hsl(198, 66%, 23%)";
  }

  let homeGameBackgroundColor = team.team_main_color;

  // When the main color has a high luminosity, either:
  // - Use the secondary if it does not also have a high luminosity, or
  // - Darken the main color
  if (Color(team.team_main_color).getLuminance() > 0.9) {
    if (Color(team.team_secondary_color).getLuminance() < 0.9) {
      homeGameBackgroundColor = team.team_secondary_color;
    } else {
      homeGameBackgroundColor = Color(team.team_main_color)
        .darken(30)
        .toString();
    }
  }

  return homeGameBackgroundColor;
}
