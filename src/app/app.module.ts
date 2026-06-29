import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ClosedQuestionComponent } from './questions/closed-question/closed-question.component';
import { OpenQuestionComponent } from './questions/open-question/open-question.component';
import { QuestionCardComponent } from './questions/question-card/question-card.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TestViewComponent } from './tests/test-view/test-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestSummaryComponent } from './tests/test-summary/test-summary.component';
import { StatementQuestionComponent } from './questions/statement-question/statement-question.component';
import { SubjectsListComponent } from './admin/subjects-list/subjects-list.component';
import { SubjectGroupsListComponent } from './admin/subject-groups-list/subject-groups-list.component';
import { CrosswordsListComponent } from './admin/crosswords-list/crosswords-list.component';
import { CrosswordEditComponent } from './admin/crossword-edit/crossword-edit.component';
import { TestsListComponent } from './admin/tests-list/tests-list.component';
import { TestEditComponent } from './admin/test-edit/test-edit.component';
import { AllAtOnceComponent } from './tests/all-at-once/all-at-once.component';
import { CrosswordViewComponent } from './crosswords/crossword-view/crossword-view.component';
import { CrosswordPlayComponent } from './crosswords/crossword-play/crossword-play.component';
import { LoginComponent } from './auth/login/login.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { AccountComponent } from './account/account.component';
import { HomeComponent } from './home/home.component';
import { UsersListComponent } from './admin/users-list/users-list.component';
import { AiGeneratorComponent } from './admin/ai-generator/ai-generator.component';
import { InboxComponent } from './admin/inbox/inbox.component';
import { ToastComponent } from './toast/toast.component';
import { MetricsComponent } from './metrics/metrics.component';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { QuillModule } from 'ngx-quill';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    ClosedQuestionComponent,
    OpenQuestionComponent,
    QuestionCardComponent,
    TestViewComponent,
    TestSummaryComponent,
    StatementQuestionComponent,
    SubjectsListComponent,
    SubjectGroupsListComponent,
    CrosswordsListComponent,
    CrosswordEditComponent,
    TestsListComponent,
    TestEditComponent,
    AllAtOnceComponent,
    CrosswordViewComponent,
    CrosswordPlayComponent,
    LoginComponent,
    AccountComponent,
    HomeComponent,
    UsersListComponent,
    ResetPasswordComponent,
    AiGeneratorComponent,
    InboxComponent,
    ToastComponent,
    MetricsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DragDropModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule.forRoot({
      loader: { provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient] },
      defaultLanguage: 'en'
    }),
    QuillModule.forRoot()
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
