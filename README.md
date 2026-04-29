# rubigo

A grab-bag of small Rust programs I've written while learning the language. Each one lives in its own Cargo project under `projects/`, so you can `cd` in and `cargo run` whichever catches your eye.

The name's a bow to Rust + the Latin **rubigō** (rust, the metal kind).

## Projects

| Project | What it does |
|---|---|
| `hello_world` | Single-file `println!` — useful as the smallest-possible Rust program (no Cargo.toml, just `main.rs`) |
| `hello_cargo` | Same idea, but with Cargo, so you can see what Cargo adds |
| `variables` | Mutability, shadowing, type inference |
| `branches` | `if`/`else` and `if let` |
| `loops` | `loop`, `while`, `for`, breaking with values |
| `functions` | Function signatures, return values, expressions vs statements |
| `slices` | String and array slices |
| `guessing_game` | The Rust Book's classic — random number, user input, comparison loop. Mine prompts in German because I was killing two birds. |
| `working_hours` | A small calculator I wrote because the textbook ones were boring |

## Run any of them

```bash
cd projects/guessing_game
cargo run
```

For `hello_world` (no Cargo):

```bash
cd projects/hello_world
rustc main.rs && ./main
```
