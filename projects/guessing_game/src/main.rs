use std::cmp::Ordering;
use std::io; // importing the input/output library into the scope of this program 

use rand::Rng;

fn main() { // no parameters needed
    println!("Errate die Zahl!"); // guess the number

    let secret_number = rand::thread_rng().gen_range(1..=100); //gives us the particular random number generator we’re going to use: one that is local to the current thread of execution and is seeded by the operating system
                                                                // gen_range method takes a range expression as an argument and generates a random number in the range
    println!("Die Geheimzahl ist: {secret_number}");

    println!("Bitte geben Sie Ihre Vermutung ein."); // please input your guess

    let mut guess = String::new();  // creating a mutable varaible named guess, which is a new empty string

    io::stdin() //a handle to the standard input for the terminal
        .read_line(&mut guess) //handles the user input, needs to be mutable so the  method can change the string's content
                              // & indicates that this argument is a reference, which gives you a way to let multiple parts of your code access one piece of data without needing to copy that data into memory multiple times
        .expect("Zeile konnte nicht gelesen werden"); //takes the enum result from above. if `err` and not `ok`, this error will be shown

    println!("Sie haben geraten: {guess}");

    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Zu klein!"),
        Ordering::Greater => println!("Zu groß!"), 
        Ordering::Equal => println!("Sie gewinnen!"), 

    }
}