const catalog=Object.freeze({
  actors:['borrower','lender'],
  facts:['return-box-open','return-message'],
  purposes:['return-item','verify-return'],
  commitments:['loan-return'],
  actions:['return','confirm','wait']
});

const returnPolicy=Object.freeze({
  options:[{id:'return',requiresFacts:['return-box-open']},{id:'wait',requiresFacts:[]}],
  rules:[{
    id:'return-with-instructions',
    when:{fact:{id:'return-box-open',value:true},purpose:{id:'return-item',status:'active'}},
    actionId:'return'
  }],
  defaultActionId:'wait'
});

const confirmationPolicy=Object.freeze({
  options:[{id:'confirm',requiresFacts:['return-message']},{id:'wait',requiresFacts:[]}],
  rules:[{
    id:'check-return-message',
    when:{
      fact:{id:'return-message',value:true},
      purpose:{id:'verify-return',status:'active'},
      interaction:{actorId:'borrower',contextId:'loan-return',value:'fulfilled'}
    },
    actionId:'confirm'
  }],
  defaultActionId:'wait'
});

const roundTrip=(api,person)=>api.restoreSituatedPerson(
  JSON.parse(JSON.stringify(api.exportSituatedPerson(person,catalog))),catalog
);

/** A structurally independent host for an asynchronous equipment return. */
export async function runConsumer(api) {
  let borrower=api.createSituatedPerson({
    human:api.createPerson({id:'borrower',body:{fatigue:0.1,hunger:0.1},skills:{handling:0.2}}),
    now:0,
    purposes:[{id:'return-item',status:'active'}]
  },catalog);
  let lender=api.createSituatedPerson({
    human:api.createPerson({id:'lender',body:{fatigue:0.1,hunger:0.1},skills:{handling:0.4}}),
    now:0,
    purposes:[{id:'verify-return',status:'active'}]
  },catalog);
  const world={itemLocation:'borrower',confirmation:'pending'};

  const borrowerBeforeInstruction=api.decide(borrower,returnPolicy,catalog,null);
  borrower=api.advancePerson(borrower,1,catalog);
  borrower=api.observePerson(borrower,{
    id:'box-instruction',at:1,source:'lender',channel:'instruction',kind:'fact',subject:'return-box-open',value:true
  },catalog);
  const borrowerAfterInstruction=api.decide(borrower,returnPolicy,catalog,null);
  const resumedBorrower=roundTrip(api,borrower);
  const resumedBorrowerDecision=api.decide(resumedBorrower,returnPolicy,catalog,null);
  if(borrowerAfterInstruction.actionId==='return')world.itemLocation='return-box';
  borrower=api.setPurpose(borrower,{id:'return-item',status:'completed'},catalog);

  lender=api.advancePerson(lender,2,catalog);
  const lenderBeforeDelivery=api.decide(lender,confirmationPolicy,catalog,null);
  const hiddenReturnDidNotReachLender=lenderBeforeDelivery.actionId==='wait'&&world.itemLocation==='return-box';

  await Promise.resolve();
  lender=api.observePerson(lender,{
    id:'return-message',at:2,source:'borrower',channel:'communication',kind:'fact',subject:'return-message',value:true
  },catalog);
  await Promise.resolve();
  lender=api.observePerson(lender,{
    id:'return-history',at:2,source:'borrower',channel:'communication',kind:'interaction',subject:'borrower',contextId:'loan-return',value:'fulfilled'
  },catalog);
  const lenderAfterDelivery=api.decide(lender,confirmationPolicy,catalog,null);
  const resumedLender=roundTrip(api,lender);
  const resumedLenderDecision=api.decide(resumedLender,confirmationPolicy,catalog,null);
  if(lenderAfterDelivery.actionId==='confirm')world.confirmation='confirmed';
  lender=api.setPurpose(lender,{id:'verify-return',status:'completed'},catalog);
  const lenderView=api.getSituatedView(lender,catalog);
  const returnHistory=lenderView.observations.find(observation=>observation.id==='return-history');

  return {
    format:'situated-person-consumer',
    version:1,
    world,
    decisions:{borrowerBeforeInstruction,borrowerAfterInstruction,lenderBeforeDelivery,lenderAfterDelivery},
    persistence:{
      borrowerResumeIdentical:JSON.stringify(resumedBorrowerDecision)===JSON.stringify(borrowerAfterInstruction),
      lenderResumeIdentical:JSON.stringify(resumedLenderDecision)===JSON.stringify(lenderAfterDelivery)
    },
    information:{
      returnWithoutInstructionBlocked:borrowerBeforeInstruction.actionId==='wait',
      hiddenReturnDidNotReachLender
    },
    receivedByLender:lenderView.observations.map(observation=>observation.id),
    returnInteractionContext:returnHistory.contextId
  };
}
