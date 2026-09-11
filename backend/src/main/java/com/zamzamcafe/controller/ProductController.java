package com.zamzamcafe.controller;
import com.zamzamcafe.model.Product;
import com.zamzamcafe.repository.ProductRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController @RequestMapping("/api/products")
public class ProductController {
  private final ProductRepository repo;
  public ProductController(ProductRepository repo){this.repo=repo;}
  @GetMapping public List<Product> all(){return repo.findAll();}
  @PostMapping public Product create(@RequestBody Product p){validate(p); return repo.save(p);}
  @PutMapping("/{id}") public Product update(@PathVariable Long id,@RequestBody Product p){
    Product x=repo.findById(id).orElseThrow();
    validate(p);
    x.setName(p.getName()); x.setDescription(p.getDescription()); x.setPrice(p.getPrice()); x.setCategory(p.getCategory()); x.setImageUrl(p.getImageUrl()); x.setAvailable(p.isAvailable());
    return repo.save(x);
  }
  @DeleteMapping("/{id}") public void delete(@PathVariable Long id){
    if(!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
    repo.deleteById(id);
  }

  private void validate(Product p) {
    if(p == null || p.getName() == null || p.getName().isBlank() || p.getName().trim().length() > 120) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required.");
    }
    if(p.getPrice() == null || p.getPrice() < 0 || p.getPrice() > 10_000_000) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product price must be zero or greater.");
    }
    if(p.getDescription() != null && p.getDescription().length() > 1000) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product description is too long.");
    }
    if(p.getCategory() != null && p.getCategory().length() > 80) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product category is too long.");
    }
  }
}