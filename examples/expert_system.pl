adult(ali).

eligible(Person) :-
    adult(Person),
    employed(Person).

main :- eligible(ali), writeln('Ali is eligible.').

employed(ali).
