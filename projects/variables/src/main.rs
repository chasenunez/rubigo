fn main() {
    let tup: (i32, f64, u8) = (500, 6.4, 1);
    let fivehundred = tup.0;
    let sixpointfour = tup.1;
    let one = tup.2;
    println!("{fivehundred}, and then {sixpointfour}, and finally {one}");
}