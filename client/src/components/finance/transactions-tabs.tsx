<div className="mb-6">
  <Tabs defaultValue="all" className="w-full">
    <TabsList className="grid w-full grid-cols-5">
      <TabsTrigger 
        value="all" 
        className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#70C7BA] data-[state=active]:to-[#49EACB] data-[state=active]:text-white"
      >
        <ListChecks className="h-4 w-4" />
        <span className="hidden sm:inline">Toutes</span>
        <Badge variant="outline" className="ml-1 bg-white/80 h-5 px-1">
          {Math.max(0, transactions.length)}
        </Badge>
      </TabsTrigger>
      <TabsTrigger 
        value="income" 
        className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#70C7BA] data-[state=active]:to-[#49EACB] data-[state=active]:text-white"
      >
        <TrendingUp className="h-4 w-4" />
        <span className="hidden sm:inline">Revenus</span>
        <Badge variant="outline" className="ml-1 bg-white/80 h-5 px-1">
          {Math.max(0, transactions.filter(t => t.type === "income").length)}
        </Badge>
      </TabsTrigger>
      <TabsTrigger 
        value="expense" 
        className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#70C7BA] data-[state=active]:to-[#49EACB] data-[state=active]:text-white"
      >
        <TrendingDown className="h-4 w-4" />
        <span className="hidden sm:inline">Dépenses</span>
        <Badge variant="outline" className="ml-1 bg-white/80 h-5 px-1">
          {Math.max(0, transactions.filter(t => t.type === "expense").length)}
        </Badge>
      </TabsTrigger>
      <TabsTrigger 
        value="pending" 
        className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#70C7BA] data-[state=active]:to-[#49EACB] data-[state=active]:text-white"
      >
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">En attente</span>
        <Badge variant="outline" className="ml-1 bg-white/80 h-5 px-1">
          {Math.max(0, transactions.filter(t => t.status === "pending").length)}
        </Badge>
      </TabsTrigger>
      <TabsTrigger 
        value="completed" 
        className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#70C7BA] data-[state=active]:to-[#49EACB] data-[state=active]:text-white"
      >
        <CheckCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Complétées</span>
        <Badge variant="outline" className="ml-1 bg-white/80 h-5 px-1">
          {Math.max(0, transactions.filter(t => t.status === "completed").length)}
        </Badge>
      </TabsTrigger>
    </TabsList>
    
    <TabsContent value="all" className="mt-4">
      <TransactionList 
        transactions={filteredTransactions} 
        onRefetch={handleRefetch}
        isLoading={isLoading}
      />
    </TabsContent>
    
    <TabsContent value="income" className="mt-4">
      <TransactionList 
        transactions={filteredTransactions.filter(t => t.type === "income")} 
        onRefetch={handleRefetch}
        isLoading={isLoading}
      />
    </TabsContent>
    
    <TabsContent value="expense" className="mt-4">
      <TransactionList 
        transactions={filteredTransactions.filter(t => t.type === "expense")} 
        onRefetch={handleRefetch}
        isLoading={isLoading}
      />
    </TabsContent>
    
    <TabsContent value="pending" className="mt-4">
      <TransactionList 
        transactions={filteredTransactions.filter(t => t.status === "pending")} 
        onRefetch={handleRefetch}
        isLoading={isLoading}
      />
    </TabsContent>
    
    <TabsContent value="completed" className="mt-4">
      <TransactionList 
        transactions={filteredTransactions.filter(t => t.status === "completed")} 
        onRefetch={handleRefetch}
        isLoading={isLoading}
      />
    </TabsContent>
  </Tabs>
</div> 