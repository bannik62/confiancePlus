-- Index pour requêtes fréquentes (liste par user, membres par groupe)
CREATE INDEX "Habit_userId_idx" ON "Habit"("userId");
CREATE INDEX "HabitLog_userId_idx" ON "HabitLog"("userId");
CREATE INDEX "DailyLog_userId_idx" ON "DailyLog"("userId");
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");
