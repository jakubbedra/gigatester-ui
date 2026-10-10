/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 3.2.1263 on 2026-06-19 18:41:42.

export interface ClosedQuestionAnswerDto {
    id: string;
    text: string;
    correct: boolean;
    points: number;
}

export interface ClosedQuestionDto extends QuestionDto {
    type: "CLOSED";
    answers: ClosedQuestionAnswerDto[];
    multipleChoice: boolean;
    points: number;
}

export interface OpenQuestionDto extends QuestionDto {
    type: "OPEN";
    answer: QuestionContentDto;
    answerVariations: QuestionContentDto[];
    gradingRules: GradingRule[];
    points: number;
    multipleAnswers?: boolean;
    orderedAnswers?: boolean;
}

export interface QuestionContentDto {
    type: QuestionContentType;
    text: string;
}

export interface QuestionDto {
    type: "QuestionDto" | "CLOSED" | "OPEN" | "STATEMENT";
    id: string;
    content: QuestionContentDto;
    explanation: QuestionContent;
    contentProportions: number;
    answerProportions: number;
    tags: TagResponse[];
}

export interface TagResponse {
    id: string;
    key: string;
}

export interface TagRequest {
    key: string;
}

export interface QuestionTagDto {
    id: string;
    value: string;
}

export interface QuestionTagListDto {
    questionTags: QuestionTagDto[];
}

export interface QuestionsListDto {
    questions: QuestionDtoUnion[];
}

export interface StatementDto {
    text: string;
    answer: boolean;
}

export interface StatementQuestionDto extends QuestionDto {
    type: "STATEMENT";
    statements: StatementDto[];
    points: number;
}

export interface QuestionSummaryResponse {
    id: string;
    questionType: QuestionType;
}

export interface QuestionsResponse {
    questions: QuestionSummaryResponse[];
}

export type ClueType = 'TEXT' | 'URL';

export interface CrosswordTermRequest {
    id?: string | null;
    term: string;
    clue: string;
    clueType: ClueType;
    tagIds?: string[];
}

export interface CrosswordRequest {
    name: string;
    terms: CrosswordTermRequest[];
}

export interface CrosswordTermResponse {
    id: string;
    term: string;
    clue: string;
    clueType: ClueType;
    tags: TagResponse[];
}

export interface CrosswordResponse {
    id: string;
    name: string;
    terms: CrosswordTermResponse[];
    authors: SubjectAuthor[];
}

export interface CrosswordsResponse {
    crosswords: CrosswordSummaryResponse[];
}

export interface CrosswordSummaryResponse {
    id: string;
    name: string;
    termCount: number;
}

export const enum BotDifficulty {
    EASY = "EASY",
    NORMAL = "NORMAL",
    HARD = "HARD",
    IMPOSSIBLE = "IMPOSSIBLE",
}

export interface CrosswordStateRequest {
    crosswordId: string;
    numberOfWords: number;
    tagFilterMode?: string;
    tagFilter?: string[];
    termIdFilter?: string[];
    botDifficulty?: BotDifficulty;
    matchAllTags?: boolean;
    /** "LETTERS" (default) or "WORDS" (Word Duel) — applies to both singleplayer and multiplayer. */
    multiplayerMode?: 'LETTERS' | 'WORDS';
}

export interface SubmitWordRequest {
    termId: string;
    word: string;
}

export interface WordTurnResultResponse {
    humanCorrect: boolean;
    humanWord: string | null;
    humanPoints: number;
    botAttempted: boolean;
    botCorrect: boolean;
    botWord: string | null;
    botPoints: number;
}

export interface CrosswordLetterRequest {
    c: string;
    row: number;
    column: number;
}

export interface CrosswordStateUpdateRequest {
    letters: CrosswordLetterRequest[];
}

export interface CrosswordPlayerResponse {
    id: string;
    handLetters: string;
    points: number;
    current: boolean;
    bot: boolean;
}

export interface CrosswordStateClueResponse {
    id: string;
    clue: string;
    clueType: ClueType;
    row: number;
    column: number;
    direction: 'ACROSS' | 'DOWN';
    solved?: boolean;
}

export interface TurnCellResult {
    row: number;
    column: number;
    letter: string;
    correct: boolean;
}

export interface CompletedWordResult {
    word: string;
    points: number;
}

export interface TurnResultResponse {
    humanResults: TurnCellResult[];
    humanWordBonus: number;
    humanCompletedWords: CompletedWordResult[];
    botPlacements: TurnCellResult[];
    botWordBonus: number;
}

export interface CrosswordStateResponse {
    id: string;
    crosswordId?: string;
    crosswordName?: string;
    currentGrid: string;
    width: number;
    height: number;
    players: CrosswordPlayerResponse[];
    clues: CrosswordStateClueResponse[];
    lastTurn?: TurnResultResponse;
    mode?: 'LETTERS' | 'WORDS';
    lastWordTurn?: WordTurnResultResponse | null;
}

export interface SubjectGroupRequest {
    name: string;
    subjects: string[];
}

export interface SubjectGroupResponse {
    id: string;
    name: string;
    subjects: string[];
    owners: SubjectAuthor[];
}

export interface SubjectGroupsResponse {
    subjectGroups: SubjectGroupSummaryResponse[];
}

export interface SubjectGroupSummaryResponse {
    id: string;
    name: string;
}

export interface SubjectRequest {
    name: string;
    description?: string;
    difficulty?: number;
    tests: string[];
    crosswords: string[];
    graphs: string[];
}

export interface CommentResponse {
    id: string;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl: string | null;
    authorRole?: string | null;
    authorAssignedRoleName?: string | null;
    content: string;
    createdAt: string;
    likes: number;
    dislikes: number;
    likedByMe: boolean;
    dislikedByMe: boolean;
    responses: CommentResponse[];
}

export interface SubjectAuthor {
    id: string;
    username: string;
    role: string;
    profilePictureUrl: string | null;
    bio: string | null;
}

export interface SubjectResponse {
    id: string;
    name: string;
    description: string | null;
    difficulty: number;
    tests: string[];
    crosswords: string[];
    graphs: string[];
    comments: CommentResponse[];
    authors: SubjectAuthor[];
}

export interface SubjectsResponse {
    subjects: SubjectSummaryResponse[];
}

export interface SubjectSummaryResponse {
    id: string;
    name: string;
}

export interface ClosedQuestionStateRequest extends QuestionStateRequest {
    questionType: "CLOSED";
    selectedAnswers: string[];
}

export interface OpenQuestionStateRequest extends QuestionStateRequest {
    questionType: "OPEN";
    givenAnswer: string;
    scoredPoints: number | null;
}

export interface QuestionStateRequest {
    questionType: "CLOSED" | "OPEN" | "STATEMENT";
    questionId: string;
    answered: boolean;
}

export interface StatementQuestionStateRequest extends QuestionStateRequest {
    questionType: "STATEMENT";
    answers: boolean[];
}

export interface TestRequest {
    name: string;
    questions: string[];
    closedQuestionsCount: number;
    openQuestionsCount: number;
    passingPercentage: number;
    hideTagsDuringTest?: boolean;
}

export interface TestStateRequest {
    closedQuestionsCount: number;
    openQuestionsCount: number;
    statementQuestionsCount: number;
    passingPercentage: number;
    mode: TestModeDto;
    displayType: TestDisplayTypeDto;
    timeLimitEnabled: boolean;
    timeLimitMs?: number;
    tagIds?: string[];
    excludeTags?: boolean;
    matchAllTags?: boolean;
    distributionMode?: 'RANDOM' | 'MAX_PER_TAG' | 'WORST';
    maxPerTag?: number;
}

export interface TestStateUpdateRequest {
    action: NavigateActionDto;
}

export interface ClosedQuestionStateResponse extends QuestionStateResponse {
    selectedAnswers: string[];
}

export interface OpenQuestionStateResponse extends QuestionStateResponse {
    givenAnswer: string;
}

export interface QuestionStateResponse {
    questionType: QuestionType;
    id: string;
    questionId: string;
    score: number;
    answered: boolean;
}

export interface StatementQuestionStateResponse extends QuestionStateResponse {
    answers: boolean[];
}

export interface TestResponse {
    id: string;
    name: string;
    questions: string[];
    closedQuestionsCount: number;
    openQuestionsCount: number;
    storedClosedQuestionsCount: number;
    storedOpenQuestionsCount: number;
    passingPercentage: number;
    timeLimit: number;
    hideTagsDuringTest: boolean;
    authors: SubjectAuthor[];
}

export interface TestStateResponse {
    id: string;
    testId: string;
    testName: string;
    questions: QuestionStateSummaryResponse[];
    closedQuestionsCount: number;
    openQuestionsCount: number;
    currentQuestionsCount: number;
    currentQuestionIndex: number;
    passingPercentage: number;
    mode: TestModeDto;
    displayType: TestDisplayTypeDto;
    executionState: TestExecutionStateDto;
    totalScore: number;
    maxScore: number;
    timeLimitEnabled: boolean;
    timeLimitMs: number;
    startTime: number;
    hideTagsDuringTest: boolean;
}

export interface QuestionStateSummaryResponse {
    id: string;
    questionId: string;
    questionType: QuestionType;
}

export interface TestsResponse {
    tests: TestSummaryResponse[];
}

export interface TestSummaryResponse {
    id: string;
    name: string;
}

export interface QuestionContent {
    id: string;
    type: ContentType;
    text: string;
}

export type QuestionDtoUnion = ClosedQuestionDto | OpenQuestionDto | StatementQuestionDto;

export type QuestionStateRequestUnion = ClosedQuestionStateRequest | OpenQuestionStateRequest | StatementQuestionStateRequest;

export const enum GradingRule {
    MANUAL = "MANUAL",
    IGNORE_CASE = "IGNORE_CASE",
    IGNORE_PUNCTUATION = "IGNORE_PUNCTUATION",
    TRIM_WHITESPACE = "TRIM_WHITESPACE",
}

export const enum Permission {
    SUBJECTS_READ = "SUBJECTS_READ",
    SUBJECTS_WRITE = "SUBJECTS_WRITE",
    TESTS_READ = "TESTS_READ",
    TESTS_WRITE = "TESTS_WRITE",
    CROSSWORDS_READ = "CROSSWORDS_READ",
    CROSSWORDS_WRITE = "CROSSWORDS_WRITE",
    GRAPHS_READ = "GRAPHS_READ",
    GRAPHS_WRITE = "GRAPHS_WRITE",
}

export interface RoleRequest {
    name: string;
    permissions: Permission[];
}

export interface RoleResponse {
    id: string;
    name: string;
    permissions: Permission[];
}

export const enum QuestionContentType {
    TEXT = "TEXT",
    HTML = "HTML",
}

export const enum QuestionType {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    STATEMENT = "STATEMENT",
    QUESTION_GROUP = "QUESTION_GROUP",
}

export const enum NavigateActionDto {
    NEXT = "NEXT",
    PREVIOUS = "PREVIOUS",
    FINISH = "FINISH",
}

export const enum TestDisplayTypeDto {
    ONE_BY_ONE = "ONE_BY_ONE",
    ALL_AT_ONCE = "ALL_AT_ONCE",
}

export const enum TestExecutionStateDto {
    IN_PROGRESS = "IN_PROGRESS",
    NOT_STARTED = "NOT_STARTED",
    IN_REVIEW = "IN_REVIEW",
    FINISHED = "FINISHED",
}

export const enum TestModeDto {
    LEARNING = "LEARNING",
    EXAM = "EXAM",
}

export const enum ContentType {
    TEXT = "TEXT",
    HTML = "HTML",
}

export interface MultiplayerPlayerInfo {
    id: string;
    username: string;
    profilePictureUrl: string | null;
}

export interface MultiplayerSessionResponse {
    id: string;
    crosswordId: string;
    crosswordName: string;
    player1: MultiplayerPlayerInfo;
    player2: MultiplayerPlayerInfo | null;
    status: 'WAITING_FOR_PLAYER' | 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
    mode?: 'LETTERS' | 'WORDS';
    currentTurnUserId: string;
    myTurn: boolean;
    lastGuessCorrect?: boolean | null;
    lastGuessWord?: string | null;
    lastGuessPoints?: number | null;
    currentGrid: string;
    width: number;
    height: number;
    myHand: string;
    player1Points: number;
    player2Points: number;
    clues: CrosswordStateClueResponse[];
    createdAt: string;
}

export interface MultiplayerSessionSummaryResponse {
    id: string;
    crosswordId: string;
    crosswordName: string;
    opponent: MultiplayerPlayerInfo | null;
    status: 'WAITING_FOR_PLAYER' | 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
    mode?: 'LETTERS' | 'WORDS';
    myTurn: boolean;
    myScore: number;
    opponentScore: number;
    createdAt: string;
}
